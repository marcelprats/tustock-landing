export const POST = async ({ cookies, redirect }) => {
  cookies.delete("session", { path: "/" });
  return redirect("/login");
};

export const GET = async ({ cookies, redirect }) => {
  cookies.delete("session", { path: "/" });
  return redirect("/login");
};