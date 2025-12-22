export const POST = async ({ request, locals }) => {
  try {
    // En Astro SSR con Cloudflare, la DB suele venir en locals.runtime.env
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ 
        error: "Base de datos no encontrada. Verifica el Binding 'DB' en el panel de Cloudflare." 
      }), { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }

    // Buscar usuario y contraseña
    const user = await db.prepare(
      "SELECT * FROM users WHERE email = ? AND password_hash = ?"
    ).bind(email, password).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Email o contraseña incorrectos" }), { status: 401 });
    }

    // Buscar su tienda (tenant)
    const tenant = await db.prepare(
      "SELECT * FROM tenants WHERE id = ?"
    ).bind(user.tenant_id).first();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "No se encontró una tienda asociada a este usuario" }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      redirectUrl: `https://${tenant.slug}.tustock.app`,
      user: { name: user.full_name, role: user.role }
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Error interno en el proceso de Login", 
      details: err.message 
    }), { status: 500 });
  }
}