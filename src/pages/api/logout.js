// src/pages/api/logout.js
export const GET = async ({ cookies, redirect }) => {
  // Borra la cookie en TODOS los caminos del dominio
  cookies.delete('session', { path: '/' });
  
  // Te redirige a la web principal (Landing), SALIENDO del subdominio
  return redirect('https://tustock.app/login'); 
};