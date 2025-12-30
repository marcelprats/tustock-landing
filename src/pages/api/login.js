import { createClient } from "@libsql/client/web";
import bcrypt from "bcryptjs"; 

export const POST = async ({ request, cookies, redirect, locals }) => {
  try {
    // 1. LEER DATOS DEL FORMULARIO (BODY)
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    
    // Obtener DB desde el entorno (Cloudflare)
    const env = locals.runtime?.env;
    if (!env) return new Response("Error de configuración de BD", { status: 500 });

    const db = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });

    // 2. BUSCAR USUARIO
    const result = await db.execute({
        sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
        args: [email]
    });

    if (result.rows.length === 0) {
        // Redirigimos al login con error (por GET, pero sin exponer password)
        return redirect("/login?error=invalid_credentials"); 
    }

    const user = result.rows[0];

    // 3. VERIFICAR HASH DE CONTRASEÑA
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        return redirect("/login?error=invalid_credentials");
    }

    // 4. CREAR SESIÓN
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: true, // Solo HTTPS
        maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    // Redirigir al Hub (o donde quisiera ir)
    const returnTo = new URL(request.url).searchParams.get("return_to") || "/hub";
    return redirect(returnTo);

  } catch (error) {
    console.error("Login Critical Error:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
};