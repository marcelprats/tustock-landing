import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    const db = locals.runtime?.env?.DB; 
    
    if (!db) {
      console.error("❌ No DB found");
      return new Response("Error interno", { status: 500 });
    }

    // 1. BUSCAR USUARIO
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return redirect("/login?error=invalid_credentials");
    }

    // 2. CREAR SESIÓN (FIX CRÍTICO)
    // Usamos import.meta.env.PROD para saber si estamos en producción.
    // En local (localhost) NO ponemos dominio. En producción ponemos .tustock.app
    const isProd = import.meta.env.PROD;
    
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        domain: isProd ? ".tustock.app" : undefined // 🔥 ESTA LÍNEA ARREGLA TODO
    });

    // 3. REDIRIGIR
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("return_to") || "/hub";
    
    return redirect(returnTo);

  } catch (error) {
    console.error("🔥 Login Error:", error);
    return new Response("Error", { status: 500 });
  }
};