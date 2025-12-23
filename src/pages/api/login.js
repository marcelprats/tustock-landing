export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) return new Response(JSON.stringify({ error: "Error de conexión DB" }), { status: 500 });

    const { email, password } = await request.json();

    if (!email || !password) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // 1. Buscar Usuario
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first();
    if (!user) return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401 });

    // 2. Buscar su Tienda
    const tenant = await db.prepare("SELECT * FROM tenants WHERE id = ?").bind(user.tenant_id).first();
    if (!tenant) return new Response(JSON.stringify({ error: "Usuario sin tienda asignada" }), { status: 404 });

    // 3. CREAR COOKIE GLOBAL (LA MAGIA)
    cookies.set('session', user.id, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD, // True solo en https
      sameSite: 'lax',               // Importante para redirecciones
      maxAge: 60 * 60 * 24 * 7,      // 7 días
      
      // 👇 ESTO PERMITE QUE EL LOGIN EN LA CENTRAL SIRVA PARA EL SUBDOMINIO
      domain: import.meta.env.PROD ? '.tustock.app' : undefined 
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      // Redirigimos directamente al subdominio de su tienda
      redirectUrl: import.meta.env.PROD 
        ? `https://${tenant.slug}.tustock.app` 
        : `/?tenant=${tenant.slug}`,
      user: { name: user.full_name, role: user.role }
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}