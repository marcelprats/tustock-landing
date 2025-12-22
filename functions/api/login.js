// Archivo: functions/api/login.js
export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const { email, password } = await context.request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
    }

    // Buscar usuario y contraseña (texto plano por ahora)
    const user = await db.prepare(
      "SELECT * FROM users WHERE email = ? AND password_hash = ?"
    ).bind(email, password).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Email o contraseña incorrectos" }), { status: 401 });
    }

    // Buscar su tienda
    const tenant = await db.prepare(
      "SELECT * FROM tenants WHERE id = ?"
    ).bind(user.tenant_id).first();

    return new Response(JSON.stringify({
      success: true,
      message: "Login correcto",
      redirectUrl: `https://${tenant.slug}.tustock.app`, // OJO: Asegúrate que coincide con tu dominio real
      user: { name: user.full_name, role: user.role }
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
