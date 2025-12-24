import { sendTelegramAlert, sendWelcomeEmail } from '../../utils/notifications';

export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    // 1. VERIFICAR SESIÓN
    const session = cookies.get('session');
    if (!session || !session.value) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }
    const userId = session.value;

    if (!db) return new Response(JSON.stringify({ error: "Error DB" }), { status: 500 });

    const { name, subdomain } = await request.json();
    if (!name || !subdomain) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // 2. VALIDAR DOMINIO
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Este subdominio ya está ocupado 😢" }), { status: 409 });
    }

    // 3. RECUPERAR EMAIL DEL USUARIO (Para enviar el correo)
    const currentUser = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
    const userEmail = currentUser?.email;

    const tenantId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // 4. TRANSACCIÓN (OJO: status = 'PENDING')
    // A. Insertar Tienda
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type, status) VALUES (?, ?, ?, 'FREE', 'PENDING')"
    ).bind(tenantId, name, subdomain).run();

    // B. Insertar Membresía
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // 5. NOTIFICACIONES (Telegram + Email)
    const msgTelegram = `🏭 <b>NUEVA TIENDA INTERNA</b>\n\nTienda: ${name}\nSlug: <code>${subdomain}</code>\nUser: ${userEmail}\n\n⚠️ Acción: Activar DNS y DB.`;

    // Usamos waitUntil para no bloquear
    if (locals.runtime?.ctx?.waitUntil) {
        locals.runtime.ctx.waitUntil(sendTelegramAlert(msgTelegram, env));
        if(userEmail) locals.runtime.ctx.waitUntil(sendWelcomeEmail(userEmail, name, env));
    } else {
        // En local esperamos
        await sendTelegramAlert(msgTelegram, env);
        if(userEmail) await sendWelcomeEmail(userEmail, name, env);
    }

    // 6. REDIRECCIÓN AL HUB (Importante: NO a la tienda nueva)
    return new Response(JSON.stringify({
      success: true,
      message: "Solicitud creada. Configurando...",
      redirectUrl: "/hub" 
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
