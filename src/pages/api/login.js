export const POST = async ({ request, locals, cookies }) => { // 1. AÑADIR 'cookies' AQUÍ
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

    // --- 2. LA MAGIA: CREAR LA COOKIE GLOBAL ---
    // Esto es lo que permite que el usuario entre en el subdominio sin loguearse de nuevo
    cookies.set('session', user.id, {
      path: '/',
      httpOnly: true,                 // No accesible por JS (Seguridad)
      secure: true,                   // Solo HTTPS
      sameSite: 'lax',                // Permite la redirección
      maxAge: 60 * 60 * 24 * 7,       // 1 Semana
      domain: import.meta.env.PROD ? '.tustock.app' : undefined 
      // 👆 EL PUNTO ES CLAVE: permite acceso a tustock.app Y *.tustock.app
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      // Si todo va bien, el frontend leerá esto y redirigirá
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