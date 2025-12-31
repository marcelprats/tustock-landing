export const POST = async ({ cookies, redirect, request }) => {
  // 1. BORRADO AGRESIVO
  // Es fundamental path: "/" para que borre la cookie global
  cookies.delete("session", { path: "/" });

  // 2. REDIRECCIÓN INTELIGENTE
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  if (referer) {
    try {
      const url = new URL(referer);
      // Si estamos en un subdominio (tienda), vamos al login de la tienda
      if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
         // Añadimos un timestamp para evitar cachés del navegador que hagan parecer que sigues logueado
         targetUrl = `/login?redirect=/admin&t=${Date.now()}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return redirect(targetUrl, 302);
};

// 🔥 ESTO ES LO QUE TE FALTABA PARA QUE EL LINK DEL HEADER FUNCIONE
// Permite que un simple enlace <a href="/api/logout"> funcione igual que un form
export const GET = async (ctx) => {
    return POST(ctx);
}