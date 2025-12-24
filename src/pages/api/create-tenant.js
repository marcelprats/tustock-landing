export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    // 1. VERIFICAR QUE EL USUARIO ESTÁ LOGUEADO
    const session = cookies.get('session');
    if (!session || !session.value) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }
    const userId = session.value;

    if (!db) return new Response(JSON.stringify({ error: "Error DB" }), { status: 500 });

    const { name, subdomain } = await request.json();

    if (!name || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }

    // 2. VALIDAR QUE EL SUBDOMINIO ESTÉ LIBRE
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Este subdominio ya está ocupado 😢" }), { status: 409 });
    }

    const tenantId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // 3. TRANSACCIÓN: CREAR TIENDA + MEMBRESÍA
    
    // A. Insertar Tienda
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type) VALUES (?, ?, ?, 'FREE')"
    ).bind(tenantId, name, subdomain).run();

    // B. Insertar Membresía (Vinculamos al usuario actual como OWNER)
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // 4. RESPONDER CON LA URL DE REDIRECCIÓN
    const redirectUrl = import.meta.env.PROD 
        ? `https://${subdomain}.tustock.app` 
        : `/?tenant=${subdomain}`;

    return new Response(JSON.stringify({
      success: true,
      message: "Tienda creada correctamente",
      redirectUrl: redirectUrl
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
