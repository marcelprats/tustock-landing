export const POST = async ({ cookies, redirect }) => {
  const isProd = import.meta.env.PROD;
  
  // 🔥 CLAVE DEL PROBLEMA: 
  // Para borrar una cookie segura, hay que repetir sus atributos EXACTOS.
  const cookieOptions = {
    path: "/",
    domain: isProd ? ".tustock.app" : undefined,
    secure: isProd,   // <--- ¡ESTO FALTABA!
    httpOnly: true    // <--- ¡ESTO TAMBIÉN!
  };

  // 1. Borrado estándar (delete)
  cookies.delete("session", cookieOptions);

  // 2. Borrado por sobrescritura (doble seguridad)
  // Forzamos la caducidad a una fecha pasada con los mismos atributos de seguridad
  cookies.set("session", "deleted", {
    ...cookieOptions,
    expires: new Date(0),
    maxAge: 0
  });

  // 3. Redirección simple al login
  return redirect('/login', 302);
};

export const GET = async (ctx) => {
    return POST(ctx);
}