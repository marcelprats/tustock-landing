import { hashLicense } from '../../../utils/crypto';

export const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;
    
    // 1. Recibimos la clave (ts_...) y métricas
    const { licenseKey, metrics } = await request.json();

    if (!licenseKey || !env.MASTER_KEY) return new Response("Error setup", { status: 400 });

    // 2. HASHEAMOS para buscar
    const searchHash = hashLicense(licenseKey);

    // 3. BUSCAMOS LA TIENDA
    const tenant = await db.prepare("SELECT id, name FROM tenants WHERE license_hash = ?")
      .bind(searchHash).first();

    if (!tenant) {
        return new Response(JSON.stringify({ error: "Licencia rechazada" }), { status: 401 });
    }

    // 4. ACTUALIZAMOS DATOS 💰
    // Si envían métricas, las usamos. Si no, 0.
    const sales = metrics?.sales || 0;
    const orders = metrics?.orders || 0;

    // Actualizamos: Latido (siempre), Ventas y Fecha de Datos
    await db.prepare(`
      UPDATE tenants 
      SET last_heartbeat = ?, 
          sales_today = ?, 
          orders_today = ?,
          data_updated_at = ? 
      WHERE id = ?
    `).bind(Date.now(), sales, orders, Date.now(), tenant.id).run();

    return new Response(JSON.stringify({ 
        status: "connected", 
        store: tenant.name,
        saved: { sales, orders }
    }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}