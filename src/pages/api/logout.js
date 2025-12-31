export const POST = async ({ cookies, redirect, request }) => {
  // 1. INTENTO DE BORRADO MULTIPLE (Para matar cookies zombies)
  
  // A) Borrar cookie global (producción)
  cookies.delete("session", { path: "/", domain: ".tustock.app" });
  
  // B) Borrar cookie local/host-only (por si acaso)
  cookies.delete("session", { path: "/" });

  // 2. REDIRECCIÓN INTELIGENTE
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  if (referer) {
    try {
      const url = new URL(referer);
      // Si venía de una tienda, le mandamos al login de esa tienda
      if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
         // Añadimos timestamp para romper caché del navegador
         targetUrl = `/login?redirect=/admin&t=${Date.now()}`;
      }
    } catch (e) {}
  }

  return redirect(targetUrl, 302);
};

export const GET = async (ctx) => {
    return POST(ctx);
}