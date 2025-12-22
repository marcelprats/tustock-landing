/**
 * POST /api/register
 * Recibe: { name, email, password, subdomain }
 * Crea: Tenant + User en la base de datos D1 y notifica por Telegram
 */
export async function onRequestPost(context) {
  try {
    const db = context.env.DB; 
    const { name, email, password, subdomain } = await context.request.json();

    // 1. Validaciones básicas
    if (!email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // 2. Generar IDs únicos
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // 3. Verificar si el subdominio ya existe
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // 4. Verificar si el email ya existe
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return new Response(JSON.stringify({ error: "Este email ya está registrado" }), { status: 409 });
    }

    // 5. Insertar la Tienda (Tenant)
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    // 6. Insertar el Usuario (Dueño)
    await db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'OWNER')"
    ).bind(userId, tenantId, email, password, name).run();

    // --- 🔔 NOTIFICACIÓN DE TELEGRAM ---
    const botToken = "8086835260:AAECb0ErvxZ_72QFM54QZeutTH1IKNbhOiQ";
    const chatId = "1320030558";
    const alertMsg = `🚀 ¡NUEVO REGISTRO EN TUSTOCK!
    
🏢 Tienda: ${name}
📧 Email: ${email}
🔗 Web: https://${subdomain}.tustock.app

⚠️ Acción requerida: Entra en Cloudflare Pages y activa el dominio personalizado para este subdominio.`;

    // Enviamos el mensaje sin bloquear la respuesta al usuario
    context.waitUntil(
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: alertMsg,
          disable_web_page_preview: true 
        })
      })
    );
    // ------------------------------------

    // 7. Respuesta de éxito
    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada con éxito",
      redirect: `https://${subdomain}.tustock.app`
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    // Error genérico del servidor
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}