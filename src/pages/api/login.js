import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    // Acceso a la BD (Cloudflare D1)
    const db = locals.runtime?.env?.DB; 
    
    if (!db) {
      console.error("❌ Error: No se encontró la base de datos");
      return new Response("Error interno de configuración", { status: 500 });
    }

    // 1. Buscar usuario por email
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user) {
        return redirect("/login?error=invalid_credentials"); 
    }

    // 2. Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        return redirect("/login?error=invalid_credentials");
    }

    // 3. CREAR SESIÓN GLOBAL (La clave de todo)
    // En Producción: domain = ".tustock.app" (con el punto inicial) -> Cookie compartida.
    // En Localhost: domain = undefined -> Cookie local simple.
    const isProd = import.meta.env.PROD;
    const cookieDomain = isProd ? ".tustock.app" : undefined;

    cookies.set("session", user.id, {
        path: "/",            // Disponible en toda la web
        httpOnly: true,       // Inaccesible para JS del cliente (seguridad)
        secure: isProd,       // Solo HTTPS en producción
        sameSite: 'lax',      // Permite navegación entre subdominios
        maxAge: 60 * 60 * 24 * 7, // Duración: 7 días
        domain: cookieDomain  // <--- ¡ESTO UNIFICA TODO!
    });

    // 4. Redirigir
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("return_to") || "/hub";
    
    return redirect(returnTo);

  } catch (error) {
    console.error("🔥 Error crítico en Login:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
};