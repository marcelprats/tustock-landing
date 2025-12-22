export const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ 
        error: "Error: DB no enlazada en Cloudflare." 
      }), { status: 500 });
    }

    const { name, email, password, subdomain } = await request.json();

    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Verificar si el subdominio ya existe
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // Inserciones
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    await db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'OWNER')"
    ).bind(userId, tenantId, email, password, name).run();

    // --- 🔔 NOTIFICACIÓN TELEGRAM ---
    const botToken = "8086835260:AAECb0ErvxZ_72QFM54QZeutTH1IKNbhOiQ";
    const chatId = "1320030558";
    const alertMsg = `🚀 ¡NUEVO REGISTRO EN TUSTOCK!\n\n🏢 Tienda: ${name}\n📧 Email: ${email}\n🔗 Web: https://${subdomain}.tustock.app`;

    // Usamos waitUntil para que no bloquee la respuesta al usuario
    if (locals.runtime?.waitUntil) {
      locals.runtime.waitUntil(
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: alertMsg, disable_web_page_preview: true })
        }).catch(e => console.error("Error Telegram:", e))
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada con éxito",
      redirect: `https://${subdomain}.tustock.app`
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Error en el registro", 
      details: err.message 
    }), { status: 500 });
  }
}