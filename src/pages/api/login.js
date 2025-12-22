export const POST = async ({ request, runtime }) => {
  try {
    // En Astro SSR con el adaptador de Cloudflare, la DB está aquí:
    const db = runtime.env.DB; 
    
    if (!db) {
      return new Response(JSON.stringify({ error: "Base de datos no conectada en Cloudflare" }), { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }

    // Buscar usuario
    const user = await db.prepare(
      "SELECT * FROM users WHERE email = ? AND password_hash = ?"
    ).bind(email, password).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Email o contraseña incorrectos" }), { status: 401 });
    }

    // Buscar su tienda
    const tenant = await db.prepare(
      "SELECT * FROM tenants WHERE id = ?"
    ).bind(user.tenant_id).first();

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
    return new Response(JSON.stringify({ error: `Error de servidor: ${err.message}` }), { status: 500 });
  }
}