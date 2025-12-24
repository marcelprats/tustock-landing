// Archivo: src/pages/api/worker/heartbeat.js
import { hashLicense } from '../../../utils/crypto';

export const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;
    
    // 1. Recibimos la clave (ts_...) y métricas
    const { licenseKey } = await request.json();

    if (!licenseKey || !env.MASTER_KEY) return new Response("Error setup", { status: 400 });

    // 2. HASHEAMOS para buscar (El servidor no sabe la clave real, solo su huella)
    const searchHash = hashLicense(licenseKey);

    // 3. BUSCAMOS LA TIENDA
    const tenant = await db.prepare("SELECT id, name FROM tenants WHERE license_hash = ?")
      .bind(searchHash).first();

    if (!tenant) {
        return new Response(JSON.stringify({ error: "Licencia rechazada" }), { status: 401 });
    }

    // 4. ✅ LATIDO EXITOSO: Actualizamos la hora
    await db.prepare("UPDATE tenants SET last_heartbeat = ? WHERE id = ?")
      .bind(Date.now(), tenant.id).run();

    return new Response(JSON.stringify({ 
        status: "connected", 
        store: tenant.name 
    }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}