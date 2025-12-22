export const POST = async ({ request, runtime }) => {
  try {
    const db = runtime.env.DB;
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }

    const user = await db.prepare(
      "SELECT * FROM users WHERE email = ? AND password_hash = ?"
    ).bind(email, password).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Email o contraseña incorrectos" }), { status: 401 });
    }

    const tenant = await db.prepare(
      "SELECT * FROM tenants WHERE id = ?"
    ).bind(user.tenant_id).first();

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      redirectUrl: `https://${tenant.slug}.tustock.app`,
      user: { name: user.full_name, role: user.role }
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}