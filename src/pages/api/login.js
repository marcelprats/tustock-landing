import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    const db = locals.runtime?.env?.DB; 
    
    if (!db) {
      return new Response("Error de BBDD", { status: 500 });
    }

    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return redirect("/login?error=invalid_credentials");
    }

    // 🔥 FIX: AÑADIR 'domain' PARA QUE SEA GLOBAL
    // Esto permite que te loguees en 'tustock.app' y entres a 'paco.tustock.app' sin loguearte de nuevo.
    // También facilita el borrado.
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        // Detectamos si estamos en producción para poner el dominio correcto
        domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    const url = new URL(request.url);
    const returnTo = url.searchParams.get("return_to") || "/hub";
    
    return redirect(returnTo);

  } catch (error) {
    console.error("Login Error:", error);
    return new Response("Error", { status: 500 });
  }
};