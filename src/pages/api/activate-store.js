import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    // 1. SEGURIDAD: Verificar que el usuario está logueado
    const session = cookies.get('session');
    if (!session || !session.value) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { storeId } = await request.json();

    if (!db || !storeId) {
      return new Response(JSON.stringify({ error: "Faltan parámetros" }), { status: 400 });
    }

    // 2. ACTUALIZAR ESTADO A ACTIVE
    // Opcional: Podrías verificar que el storeId pertenece al usuario de la sesión
    // pero para agilizar el ping, con el ID es suficiente.
    const result = await db.prepare(
      "UPDATE tenants SET status = 'ACTIVE' WHERE id = ?"
    ).bind(storeId).run();

    if (result.success) {
      console.log(`✅ Tienda ${storeId} activada correctamente en D1`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Tienda activada" 
      }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "No se pudo actualizar" }), { status: 500 });
    }

  } catch (err: any) {
    console.error("Error en activate-store:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};