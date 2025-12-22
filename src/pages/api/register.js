export const POST = async ({ request, runtime }) => {
  try {
    // 1. Acceso a la DB a través del runtime de Cloudflare
    const db = runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ 
        error: "Error de configuración: La base de datos DB no está enlazada en el panel de Cloudflare." 
      }), { status: 500 });
    }

    const { name, email, password, subdomain } = await request.json();

    // 2. Validaciones básicas
    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // 3. IDs únicos
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // 4. Verificar subdominio (slug)
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // 5. Transacción de inserción (Tienda + Usuario)
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    await db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'OWNER')"
    ).bind(userId, tenantId, email, password, name).run();

    // --- 🔔 NOTIFICACIÓN TELEGRAM ---
    const botToken = "8086835260:AAECb0ErvxZ_72QFM54QZeutTH1IKNbhOiQ";
    const chatId = "1320030558";
    const alertMsg = `🚀 ¡NUEVO REGISTRO EN TUSTOCK!
    
🏢 Tienda: ${name}
📧 Email: ${email}
🔗 Web: https://${subdomain}.tustock.app`;

    // Usamos waitUntil para que el mensaje se envíe en segundo plano
    if (runtime.waitUntil) {
      runtime.waitUntil(
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: alertMsg, 
            disable_web_page_preview: true 
          })
        }).catch(e => console.error("Error Telegram:", e))
      );
    }

    // 6. Respuesta de éxito
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
      error: "Error interno del servidor", 
      details: err.message 
    }), { status: 500 });
  }
}