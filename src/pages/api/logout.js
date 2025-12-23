export const GET = async ({ cookies, redirect }) => {
  // 1. Borramos la cookie de sesión
  // (Asegúrate de usar el mismo nombre de cookie que usas al hacer login)
  cookies.delete('session', {
    path: '/',
  });

  // 2. Si guardas algún dato más (como 'tenant_id'), bórralo también:
  // cookies.delete('tenant_id', { path: '/' });

  // 3. Redirigimos al usuario a la pantalla de entrada
  return redirect('/login');
};