import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, locals }) => {
  try {
    // Leemos el cuerpo como JSON (ya no como FormData tradicional)
    const data = await request.json(); 
    const email = data.email;
    const password = data.password;
    
    // Conexión DB
    const db = locals.runtime?.env?.DB; 
    if (!db) return new Response(JSON.stringify({ error: "Error de conexión a BD" }), { status: 500 });

    // 1. Validar Usuario
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401 });
    }

    // 2. Crear Cookie
    const isProd = import.meta.env.PROD;
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        domain: isProd ? ".tustock.app" : undefined
    });

    // 3. Decidir destino (pero no redirigir, solo informar)
    // El frontend se encargará de mover al usuario.
    const url = new URL(request.url);
    const host = url.host;
    let destination = "/hub"; // Por defecto

    // Si return_to existe
    if (data.return_to && data.return_to.startsWith('/')) {
        destination = data.return_to;
    } else if (host.split('.').length >= 3 && !host.startsWith('www')) {
        // Si estamos en una tienda -> Admin
        destination = "/admin";
    }

    return new Response(JSON.stringify({ success: true, redirect: destination }), { status: 200 });

  } catch (error) {
    console.error("Login Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};