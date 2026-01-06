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

        // --- 🆕 NUEVO: OBTENER DATOS DEL USUARIO (FULL_NAME) ---
        // Hacemos una consulta rápida para sacar el nombre de la tabla users
        const userData = await db.prepare(`
            SELECT full_name, email FROM users WHERE id = ?
        `).bind(userId).first();

        // 2. Obtener Tiendas del Usuario (Con el fix del plan_type que hicimos antes)
        const stores = await db.prepare(`
            SELECT 
                t.id, t.name, t.slug, t.status, t.license_encrypted, 
                t.plan_type, -- Recuerda que añadimos esto
                m.role
            FROM memberships m
            JOIN tenants t ON m.tenant_id = t.id
            WHERE m.user_id = ? AND t.status = 'ACTIVE'
        `).bind(userId).all();

        // 3. Procesar datos
        const results = [];
        if (stores.results) {
            for (const store of stores.results) {
                let licenseKey = null;
                if (store.license_encrypted && env.MASTER_KEY) {
                    licenseKey = decryptLicense(store.license_encrypted, env.MASTER_KEY);
                }

                results.push({
                    id: store.id,
                    name: store.name,
                    slug: store.slug,
                    role: store.role,
                    plan_type: store.plan_type || 'FREE',
                    url: `https://${store.slug}.tustock.app`,
                    license_key: licenseKey
                });
            }
        }

        // 4. Respuesta Final (Añadimos full_name)
        return new Response(JSON.stringify({
            success: true,
            user_id: userId,
            full_name: userData?.full_name || 'Usuario', // 👈 ¡AQUÍ LO ENVIAMOS!
            email: userData?.email,
            stores: results
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};