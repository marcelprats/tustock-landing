export const POST = async ({ request, locals, cookies }) => { // 1. AÑADIR 'cookies'
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: "DB Error" }), { status: 500 });
    }

    const { name, email, password, subdomain } = await request.json();

    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // Generamos IDs
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Validar subdominio
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // Inserciones (Transacción idealmente, pero así vale por ahora)
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    await db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'OWNER')"
    ).bind(userId, tenantId, email, password, name).run();

    // --- 2. LA MAGIA: COOKIE GLOBAL AL REGISTRARSE ---
    cookies.set('session', userId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    // Notificación Telegram (Sin cambios)
    const botToken = "8086835260:AAECb0ErvxZ_72QFM54QZeutTH1IKNbhOiQ";
    const chatId = "1320030558";
    const alertMsg = `🚀 ¡NUEVO REGISTRO!\n🏢 ${name}\n🔗 https://${subdomain}.tustock.app`;

    if (locals.runtime?.waitUntil) {
      locals.runtime.waitUntil(
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: alertMsg })
        }).catch(e => console.error(e))
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada",
      redirect: `https://${subdomain}.tustock.app`
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Error registro", 
      details: err.message 
    }), { status: 500 });
  }
}