import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  console.log("--> INTENTO DE LOGIN RECIBIDO (POST)"); // Debug en logs

  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const returnUrl = formData.get("return_to");

    const db = locals.runtime?.env?.DB; 
    if (!db) return new Response("Error Base de Datos", { status: 500 });

    // 1. Validar Usuario
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return redirect("/login?error=invalid_credentials");
    }

    // 2. Crear Cookie Global
    const isProd = import.meta.env.PROD;
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        domain: isProd ? ".tustock.app" : undefined
    });

    // 3. Redirección Inteligente
    if (returnUrl && returnUrl.startsWith('/')) {
        return redirect(returnUrl);
    }

    const url = new URL(request.url);
    const host = url.host;

    // Si es una tienda (subdominio), vamos al Admin
    if (host.split('.').length >= 3 && !host.startsWith('www')) {
        return redirect("/admin");
    } 
    
    // Si es la web principal, al Hub
    return redirect("/hub");

  } catch (error) {
    console.error("Login Error:", error);
    return new Response(`Error Interno: ${error.message}`, { status: 500 });
  }
};

// 🔥 ELIMINAMOS EL GET PARA NO CONFUNDIRNOS
// Si entras por GET, te mandamos al formulario de login de nuevo
export const GET = async ({ redirect }) => {
    return redirect("/login");
}