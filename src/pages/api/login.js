import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    // 🔥 ACCESO A BBDD D1 DE CLOUDFLARE
    const db = locals.runtime?.env?.DB; 
    
    if (!db) {
      console.error("❌ No se encontró la base de datos DB en locals.runtime.env");
      return new Response("Error de configuración de base de datos", { status: 500 });
    }

    // 1. BUSCAR USUARIO EN D1
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user) {
        console.log("❌ Usuario no encontrado:", email);
        return redirect("/login?error=invalid_credentials"); 
    }

    // 2. VERIFICAR CONTRASEÑA
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        console.log("❌ Contraseña incorrecta para:", email);
        return redirect("/login?error=invalid_credentials");
    }

    // 3. CREAR SESIÓN
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    // 4. REDIRIGIR
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("return_to") || "/hub";
    
    return redirect(returnTo);

  } catch (error) {
    console.error("🔥 Error crítico en Login:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
};