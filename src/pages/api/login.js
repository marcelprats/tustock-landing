import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    // Obtener "return_to" si venía en el formulario
    const returnUrl = formData.get("return_to");

    const db = locals.runtime?.env?.DB; 
    if (!db) return new Response("Error DB", { status: 500 });

    // 1. Validar Usuario
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return redirect("/login?error=invalid_credentials");
    }

    // 2. Crear Cookie Global (.tustock.app)
    const isProd = import.meta.env.PROD;
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        domain: isProd ? ".tustock.app" : undefined
    });

    // 3. REDIRECCIÓN INTELIGENTE (Aquí estaba el fallo del 404)
    // Si ya teníamos un destino claro, vamos allí.
    if (returnUrl && returnUrl.startsWith('/')) {
        return redirect(returnUrl);
    }

    // Si no, decidimos según el dominio donde estemos:
    const url = new URL(request.url);
    const host = url.host; // ej: frutpaco.tustock.app

    // Si es un subdominio de tienda (tiene 3 partes o más y no es www/app)
    if (host.split('.').length >= 3 && !host.startsWith('www') && !host.startsWith('app')) {
        // Estamos en una tienda -> Vamos al Admin de la tienda
        return redirect("/admin");
    } else {
        // Estamos en la web principal -> Vamos al Hub general
        return redirect("/hub");
    }

  } catch (error) {
    console.error("Login Error:", error);
    return new Response("Error Interno", { status: 500 });
  }
};

// Pequeño truco: Si alguien entra por GET a la API, le decimos que existe
export const GET = async () => {
    return new Response(JSON.stringify({ status: "Login API Ready" }), {
        headers: { "Content-Type": "application/json" }
    });
}