export const GET = async ({ cookies, redirect }) => {
  // BORRAMOS LA COOKIE GLOBAL
  cookies.delete('session', {
    path: '/',
    // ¡OJO! Esto debe coincidir con como la creaste en el login
    domain: import.meta.env.PROD ? '.tustock.app' : undefined 
  });

  // Redirigimos a la home pública (Landing)
  const homeUrl = import.meta.env.PROD ? 'https://tustock.app/login' : '/login';
  return redirect(homeUrl);
};