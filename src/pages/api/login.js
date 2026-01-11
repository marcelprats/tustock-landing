import bcrypt from "bcryptjs";
import { SignJWT } from "jose"; // 👈 Necesario para crear el token

export const POST = async ({ request, cookies, locals }) => {
  try {
    const data = await request.json(); 
    const email = data.email;
    const password = data.password;
    
    // Accedemos a las variables de entorno de Cloudflare
    const env = locals.runtime?.env;
    const db = env?.DB; 
    
    if (!db) return new Response(JSON.stringify({ error: "Error de conexión a BD" }), { status: 500 });

    // 1. Validar Usuario
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

    // Verificamos usuario y contraseña
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), { status: 401 });
    }

    // 🔥 2. GENERAR TOKEN JWT CON LA MASTER_KEY
    // Usamos la misma clave que usas para las licencias en register.js
    const secretKey = env.MASTER_KEY; 

    let token = null;

    if (!secretKey) {
        console.error("⚠️ CRITICAL: Falta MASTER_KEY en las variables de entorno");
        // No fallamos el login, pero no devolvemos token (Electron no podrá conectar)
    } else {
        const secret = new TextEncoder().encode(secretKey);
        
        // Creamos el "Pasaporte"
        token = await new SignJWT({ 
            sub: user.id,       
            email: user.email,  
            name: user.full_name,
            role: 'USER' // Puedes añadir roles si quieres
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Duración de 30 días
        .sign(secret);
    }

    // 3. Crear Cookie (Para la sesión en la Web)
    const isProd = import.meta.env.PROD;
    cookies.set("session", user.id, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        domain: isProd ? ".tustock.app" : undefined
    });

    // 4. Decidir redirección (Lógica de tu web)
    const url = new URL(request.url);
    const host = url.host;
    let destination = "/hub"; // Por defecto
    
    // Si viene return_to
    if (data.return_to && data.return_to.startsWith('/')) {
        destination = data.return_to;
    } else if (host.split('.').length >= 3 && !host.startsWith('www')) {
        destination = "/admin"; // Si es subdominio
    }

    // ✅ 5. RESPUESTA FINAL
    // Devolvemos el token en el JSON para que Electron lo pueda leer
    return new Response(JSON.stringify({ 
        success: true, 
        redirect: destination,
        token: token 
    }), { status: 200 });

  } catch (error) {
    console.error("Login Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};