export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ 
        error: "Base de datos no encontrada." 
      }), { status: 500 });
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

    // Buscar su tienda principal
    const tenant = await db.prepare(
      "SELECT * FROM tenants WHERE id = ?"
    ).bind(user.tenant_id).first();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Usuario sin tienda asociada" }), { status: 404 });
    }

    // --- COOKIE CONFIGURADA CORRECTAMENTE ---
    cookies.set('session', user.id, {
      path: '/',
      httpOnly: true,
      // FIX CRÍTICO: secure solo true en Producción, si no en local falla
      secure: import.meta.env.PROD, 
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined 
    });

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
      error: "Error interno", 
      details: err.message 
    }), { status: 500 });
  }
}
