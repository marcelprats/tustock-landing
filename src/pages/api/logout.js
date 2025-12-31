export const POST = async ({ cookies, redirect, request }) => {
  // 1. INTENTO DE BORRADO MASIVO (Matamos todas las versiones posibles)
  
  // Opción A: Borrar cookie global (Producción)
  cookies.delete("session", { path: "/", domain: ".tustock.app" });
  
  // Opción B: Borrar cookie local (Localhost o antiguas)
  cookies.delete("session", { path: "/" });

  // 2. REDIRECCIÓN INTELIGENTE
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  if (referer) {
    try {
      const url = new URL(referer);
      // Si venía de una tienda, le devolvemos al login de esa tienda
      if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
         // Añadimos timestamp para romper la caché visual del navegador
         targetUrl = `/login?redirect=/admin&t=${Date.now()}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return redirect(targetUrl, 302);
};

export const GET = async (ctx) => {
    return POST(ctx);
}