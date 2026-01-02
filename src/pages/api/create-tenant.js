import { sendTelegramAlert, sendWelcomeEmail } from '../../utils/notifications';
import { generateLicenseKey, hashLicense, encryptLicense } from '../../utils/crypto';
import { createClient } from '@libsql/client/web'; // 🔥 IMPORTANTE PARA TURSO

// --- 📅 FORMATO FECHA ---
const getSqlDate = () => {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    // 1. VERIFICAR SESIÓN
    const session = cookies.get('session');
    if (!session || !session.value) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }
    const userId = session.value;

    if (!db) return new Response(JSON.stringify({ error: "Error DB" }), { status: 500 });

    const { name, subdomain } = await request.json();
    if (!name || !subdomain) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // 2. VALIDAR DOMINIO
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Este subdominio ya está ocupado 😢" }), { status: 409 });
    }

    // 3. RECUPERAR DATOS USUARIO
    const currentUser = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();
    const userEmail = currentUser?.email;
    const fullWebsiteUrl = `https://${subdomain}.tustock.app`;

    const tenantId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // 4. 🔐 GENERAR LICENCIA SEGURA
    if (!env.MASTER_KEY || !env.TURSO_DB_URL || !env.TURSO_AUTH_TOKEN) {
         throw new Error("Falta configuración (MASTER_KEY o TURSO)");
    }

    const rawLicense = generateLicenseKey();
    const licenseHash = hashLicense(rawLicense);
    const licenseEncrypted = encryptLicense(rawLicense, env.MASTER_KEY);

    // 5. TRANSACCIÓN
    // A. Insertar Tienda (Con hash y encrypted)
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type, status, license_hash, license_encrypted) VALUES (?, ?, ?, 'FREE', 'PENDING', ?, ?)"
    ).bind(tenantId, name, subdomain, licenseHash, licenseEncrypted).run();

    // B. Insertar Membresía
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // 6. 🚀 SYNC CON TURSO (Licencias App Escritorio)
    let tursoSyncError = null;
    try {
        const turso = createClient({
            url: env.TURSO_DB_URL,
            authToken: env.TURSO_AUTH_TOKEN
        });

        await turso.execute({
            sql: `INSERT INTO licenses (
                key, company_name, owner_email, website_url, plan_type,
                created_at, is_active, token_balance, total_usage, hw_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                rawLicense, name, userEmail, fullWebsiteUrl, 'FREE',
                getSqlDate(), 1, 100, 0, null
            ]
        });
        console.log(`✅ Turso Sync OK (Secondary): ${rawLicense}`);

    } catch (err) {
        tursoSyncError = err.message;
        console.error("❌ ERROR SYNC TURSO (Secondary):", err);
        // No bloqueamos, pero avisamos
    }

    // 7. NOTIFICACIONES
    const syncStatus = tursoSyncError ? `⚠️ Error Turso: ${tursoSyncError}` : `✅ Turso OK`;
    const msgTelegram = `🏭 <b>NUEVA TIENDA SECUNDARIA</b>\n\nTienda: ${name}\nSlug: <code>${subdomain}</code>\nLicencia: <code>${rawLicense}</code>\nSync: ${syncStatus}`;

    if (locals.runtime?.ctx?.waitUntil) {
        locals.runtime.ctx.waitUntil(sendTelegramAlert(msgTelegram, env));
        if(userEmail) locals.runtime.ctx.waitUntil(sendWelcomeEmail(userEmail, name, env));
    } else {
        await sendTelegramAlert(msgTelegram, env);
        if(userEmail) await sendWelcomeEmail(userEmail, name, env);
    }

    // 7. REDIRECCIÓN
    return new Response(JSON.stringify({
      success: true,
      message: "Tienda creada.",
      redirectUrl: "/hub" 
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
