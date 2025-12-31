export const POST = async ({ cookies, redirect, request }) => {
  // 1. FORZAR BORRADO DE COOKIE
  // Es crítico poner { path: "/" } porque la cookie de sesión es global.
  cookies.delete("session", { path: "/" });

  // 2. DETECTAR ORIGEN PARA REDIRECCIÓN INTELIGENTE
  // Si el usuario estaba en "paco.tustock.app", le mandamos al login de Paco.
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  if (referer) {
    try {
      const url = new URL(referer);
      // Si venía del admin de una tienda, le devolvemos al login de esa tienda
      // para que vea "Acceder a Paco" y no el login genérico.
      if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
         targetUrl = '/login?redirect=/admin';
      }
    } catch (e) {
      // Si falla la detección, fallback al login normal
    }
  }

  return redirect(targetUrl, 302);
};

// Soportar GET por si alguien entra directo a /api/logout
export const GET = async (ctx) => {
    return POST(ctx);
}