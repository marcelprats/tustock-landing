export const POST = async ({ cookies, redirect, request }) => {
  console.log("--> EJECUTANDO LOGOUT NUCLEAR...");

  // 1. Borrado MULTI-DOMINIO (Dispara a todo lo que se mueva)
  
  // Opción A: Dominio global con punto (El estándar de Prod)
  cookies.delete("session", { path: "/", domain: ".tustock.app" });
  
  // Opción B: Dominio global SIN punto (A veces los navegadores son raros)
  cookies.delete("session", { path: "/", domain: "tustock.app" });

  // Opción C: Dominio Local / Host actual (Para cookies zombies locales)
  cookies.delete("session", { path: "/" });

  // 2. Redirección
  const referer = request.headers.get('referer');
  let targetUrl = '/login';

  // Si vienes de una tienda, te manda al login de esa tienda con un parámetro de tiempo
  // para obligar al navegador a refrescar la caché.
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.host.split('.').length >= 3 && !url.host.startsWith('www')) {
          targetUrl = `/login?redirect=/admin&cache_buster=${Date.now()}`;
      }
    } catch (e) { console.error(e); }
  }

  return redirect(targetUrl, 302);
};

// Permite que funcione con enlaces simples <a> también
export const GET = async (ctx) => {
    return POST(ctx);
}