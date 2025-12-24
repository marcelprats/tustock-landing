import { sendTelegramAlert } from '../../utils/notifications';

export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) return new Response(JSON.stringify({ error: "Error DB" }), { status: 500 });

    const { name, email, password, subdomain } = await request.json();

    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // Generamos IDs
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // 1. Validar si existe la tienda (por slug)
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }
    
    // 2. Validar si existe el usuario (por email)
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Este email ya está registrado. Por favor, inicia sesión y crea una nueva tienda desde el Hub." }), { status: 409 });
    }

    // --- BLOQUE DE INSERCIÓN (3 TABLAS) ---
    
    // A. Crear Tienda (OJO: status = 'PENDING')
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type, status) VALUES (?, ?, ?, 'FREE', 'PENDING')"
    ).bind(tenantId, name, subdomain).run();

    // B. Crear Usuario
    await db.prepare(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, password, name).run();

    // C. Crear Membresía (OWNER)
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // --- FIN BLOQUE INSERCIÓN ---

    // 3. Crear Cookie Global (Auto-login)
    cookies.set('session', userId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    // 4. NOTIFICACIÓN A TELEGRAM 🔔
    const msg = `🆕 <b>NUEVO REGISTRO (USUARIO + TIENDA)</b>\n\n👤 Usuario: ${name} (${email})\n🏪 Tienda: ${name}\n🔗 Slug: <code>${subdomain}</code>\n\n⚠️ <b>ACCIÓN REQUERIDA:</b>\n1. Crear DNS en Cloudflare.\n2. Activar tienda en DB.`;
    
    // Usamos waitUntil para no hacer esperar al usuario mientras se envía el mensaje
    if (locals.runtime?.ctx?.waitUntil) {
        locals.runtime.ctx.waitUntil(sendTelegramAlert(msg, env));
    } else {
        await sendTelegramAlert(msg, env); // En local esperamos
    }

    // 5. RESPUESTA (Redirigimos al HUB, no al subdominio)
    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada. Configurando tienda...",
      redirect: "/hub" // <--- CAMBIO IMPORTANTE
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Error registro", details: err.message }), { status: 500 });
  }
}
