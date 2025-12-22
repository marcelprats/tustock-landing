/**
 * POST /api/register
 */
export async function onRequestPost(context) {
  try {
    const db = context.env.DB; 
    const { name, email, password, subdomain } = await context.request.json();

    // Validaciones
    if (!email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // IDs
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Verificar subdominio
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }

    // Verificar email
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return new Response(JSON.stringify({ error: "Este email ya está registrado" }), { status: 409 });
    }

    // Insertar Tienda
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    // Insertar Usuario
    await db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, 'OWNER')"
    ).bind(userId, tenantId, email, password, name).run();

    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada",
      redirect: `https://${subdomain}.tustock.app`
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
