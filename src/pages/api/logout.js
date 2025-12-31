export const POST = async ({ cookies, redirect, request }) => {
  
  // 🔥 Usamos la misma lógica de dominio que en el Login
  const isProd = import.meta.env.PROD;
  const cookieDomain = isProd ? ".tustock.app" : undefined;

  // 1. Borrar la cookie GLOBAL (La correcta)
  cookies.delete("session", { path: "/", domain: cookieDomain });

  // 2. Limpieza de seguridad (Borrar posibles cookies zombies antiguas sin dominio)
  cookies.delete("session", { path: "/" });

  // 3. Redirección Inteligente
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  // Si el usuario sale desde una tienda específica (ej: paco.tustock.app),
  // le mandamos de vuelta al login de esa tienda para que vea su logo.
  if (referer) {
      try {
        const url = new URL(referer);
        if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
            // Añadimos timestamp para evitar que el navegador use la caché visual
            targetUrl = `/login?redirect=/admin&ts=${Date.now()}`;
        }
      } catch (e) {
          console.error(e);
      }
  }

  return redirect(targetUrl, 302);
};

// Permitir GET para que funcionen los enlaces simples <a href="/api/logout">
export const GET = async (ctx) => {
    return POST(ctx);
}