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

    // 1. Validar si existe la tienda
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // --- BLOQUE DE INSERCIÓN (3 TABLAS) ---
    
    // A. Crear Tienda
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    // B. Crear Usuario (Nota: Ya no insertamos tenant_id ni role aquí)
    await db.prepare(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, password, name).run();

    // C. Crear Membresía (El vínculo)
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // --- FIN BLOQUE INSERCIÓN ---

    // Crear Cookie Global
    cookies.set('session', userId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    // Telegram Notificación (Opcional)
    // ... (puedes dejar tu código de telegram aquí) ...

    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada",
      redirect: `https://${subdomain}.tustock.app`
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error registro", details: err.message }), { status: 500 });
  }
}