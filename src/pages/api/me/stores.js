import { decryptLicense } from '../../../utils/crypto';

export const GET = async ({ locals, cookies }) => {
    try {
        // 1. Validar Sesión
        const session = cookies.get('session');
        if (!session || !session.value) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const userId = session.value;
        const env = locals.runtime?.env;
        const db = env?.DB;

        if (!db) {
            return new Response(JSON.stringify({ error: "Database not connected" }), { status: 500 });
        }

        // 2. Obtener Tiendas del Usuario
        // Obtenemos: Datos tienda + Rol + Licencia (Encrypted)
        const stores = await db.prepare(`
            SELECT t.id, t.name, t.slug, t.status, t.license_encrypted, m.role
            FROM memberships m
            JOIN tenants t ON m.tenant_id = t.id
            WHERE m.user_id = ? AND t.status = 'ACTIVE'
        `).bind(userId).all();

        // 3. Procesar datos (Desencriptar licencias)
        const results = [];
        if (stores.results) {
            for (const store of stores.results) {
                let licenseKey = null;

                // Intentar desencriptar
                if (store.license_encrypted && env.MASTER_KEY) {
                    licenseKey = decryptLicense(store.license_encrypted, env.MASTER_KEY);
                }

                results.push({
                    id: store.id,
                    name: store.name,
                    slug: store.slug,
                    role: store.role,
                    url: `https://${store.slug}.tustock.app`,
                    license_key: licenseKey // La app usará esto para el login
                });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            user_id: userId,
            stores: results
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
