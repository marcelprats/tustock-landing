export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    if (!db) return new Response(JSON.stringify({ error: "Error DB" }), { status: 500 });

    const { email, password } = await request.json();

    if (!email || !password) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // 1. Verificar Usuario (Email/Pass)
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first();
    if (!user) return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401 });

    // 2. BUSCAR MEMBRESÍAS (JOIN con Tenants para saber los nombres)
    const memberships = await db.prepare(`
        SELECT t.name, t.slug, m.role 
        FROM memberships m
        JOIN tenants t ON m.tenant_id = t.id
        WHERE m.user_id = ?
    `).bind(user.id).all();

    // Si no tiene ninguna tienda asociada
    if (!memberships.results || memberships.results.length === 0) {
        return new Response(JSON.stringify({ error: "Usuario sin tiendas asignadas" }), { status: 403 });
    }

    // 3. DECIDIR EL DESTINO
    let redirectUrl = "";
    const stores = memberships.results;

    // Si tiene SOLAMENTE UNA tienda, lo mandamos directo
    if (stores.length === 1) {
        const slug = stores[0].slug;
        redirectUrl = import.meta.env.PROD 
            ? `https://${slug}.tustock.app`
            : `/?tenant=${slug}`;
    } else {
        // Si tiene VARIAS, lo mandamos al Hub (o al Dashboard principal)
        redirectUrl = import.meta.env.PROD 
            ? "https://tustock.app/hub"
            : "/hub"; // Ojo: Asegúrate de tener la ruta /hub o que el index maneje esto
    }

    // 4. COOKIE GLOBAL
    cookies.set('session', user.id, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      redirectUrl: redirectUrl,
      user: { name: user.full_name }
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}