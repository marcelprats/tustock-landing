export const POST = async ({ cookies, redirect }) => {
  cookies.delete("session", { path: "/" });
  return redirect("/login");
};

// 🔥 AÑADIR ESTO: Para que funcione también si lo escribes en la barra o es un enlace
export const GET = async ({ cookies, redirect }) => {
  cookies.delete("session", { path: "/" });
  return redirect("/login");
};