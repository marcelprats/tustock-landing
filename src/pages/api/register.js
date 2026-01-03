import { sendTelegramAlert } from '../../utils/notifications';
import bcrypt from 'bcryptjs';
import { hashLicense, encryptLicense } from '../../utils/crypto';
import { createClient } from '@libsql/client/web';

// --- 🛠️ GENERADOR DE LICENCIAS ---
const generateProLicense = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    // Usamos el API de crypto nativo del Worker
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(13)))
        .map(b => chars[b % chars.length])
        .join('');
    return `TUSTOCK-${randomPart}`;
};

// --- 📅 FORMATO FECHA ---
const getSqlDate = () => {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

export const POST = async ({ request, locals, cookies }) => {
    try {
        const env = locals.runtime?.env;
        const db = env?.DB; // Cloudflare D1

        // 0. Validaciones de Entorno
        if (!db) return new Response(JSON.stringify({ error: "Error de conexión con base de datos D1" }), { status: 500 });
        if (!env.MASTER_KEY || !env.TURSO_DB_URL || !env.TURSO_AUTH_TOKEN) {
            console.error("CRITICAL: Faltan secrets en Cloudflare (TURSO o MASTER_KEY)");
            return new Response(JSON.stringify({ error: "Servidor no configurado correctamente" }), { status: 500 });
        }

        // 1. Recibir datos
        const { type, full_name, name, email, password, subdomain } = await request.json();

        // VALIDACIÓN BÁSICA
        if (!email || !password || !full_name) {
            return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), { status: 400 });
        }

        const isOwner = (type !== 'employee');

        // Si es OWNER, exigimos datos de tienda
        if (isOwner && (!name || !subdomain)) {
            return new Response(JSON.stringify({ error: "Falta nombre de tienda o subdominio" }), { status: 400 });
        }

        const realUserName = full_name;
        const fullWebsiteUrl = isOwner ? `https://${subdomain}.tustock.app` : null;

        // 2. Comprobar existencia previa en D1
        if (isOwner) {
            const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
            if (existingTenant) return new Response(JSON.stringify({ error: "Esa URL de tienda ya está ocupada" }), { status: 409 });
        }
        
        const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (existingUser) return new Response(JSON.stringify({ error: "Este email ya tiene una cuenta" }), { status: 409 });

        // --- 🔐 FASE CRIPTOGRAFÍA ---
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        // 3. LOGICA DIFERENCIADA
        if (isOwner) {
            // == FLUJO DUEÑO (Usuario + Tienda + Licencia) ==
            const rawLicense = generateProLicense();
            const licenseHash = hashLicense(rawLicense);
            const licenseEncrypted = encryptLicense(rawLicense, env.MASTER_KEY);
            const tenantId = crypto.randomUUID();
            const membershipId = crypto.randomUUID();

            // Insert D1
            await db.batch([
                db.prepare("INSERT INTO tenants (id, name, slug, plan_type, status, license_hash, license_encrypted) VALUES (?, ?, ?, 'FREE', 'ACTIVE', ?, ?)").bind(tenantId, name, subdomain, licenseHash, licenseEncrypted),
                db.prepare("INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)").bind(userId, email, hashedPassword, realUserName),
                db.prepare("INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')").bind(membershipId, userId, tenantId)
            ]);

            // Sync Turso
            let tursoSyncError = null;
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                await turso.execute({
                    sql: `INSERT INTO licenses (key, company_name, owner_email, website_url, plan_type, created_at, is_active, token_balance, total_usage, hw_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [rawLicense, name, email, fullWebsiteUrl, 'FREE', getSqlDate(), 1, 100, 0, null]
                });
            } catch (err) {
                tursoSyncError = err.message;
                console.error("❌ ERROR SYNC TURSO:", err);
            }

            // Notificación Owner
            const syncStatus = tursoSyncError ? `⚠️ Error Turso: ${tursoSyncError}` : `✅ Turso OK`;
            const msg = `🚀 <b>NUEVA ALTA OWNER</b>\n\n👤 <b>${realUserName}</b>\n📧 ${email}\n🔗 ${fullWebsiteUrl}\n🔑 <code>${rawLicense}</code>\n📦 Sync: ${syncStatus}`;
            if (locals.runtime?.ctx?.waitUntil) locals.runtime.ctx.waitUntil(sendTelegramAlert(msg, env));

        } else {
            // == FLUJO EMPLEADO (Solo Usuario) ==
            await db.prepare("INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)").bind(userId, email, hashedPassword, realUserName).run();

            // Notificación Worker
            const msg = `👷 <b>NUEVO ALTA TRABAJADOR</b>\n\n👤 <b>${realUserName}</b>\n📧 ${email}`;
            if (locals.runtime?.ctx?.waitUntil) locals.runtime.ctx.waitUntil(sendTelegramAlert(msg, env));
        }

        // --- 5. SESIÓN ---
        cookies.set('session', userId, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            domain: import.meta.env.PROD ? '.tustock.app' : undefined
        });

        return new Response(JSON.stringify({
            success: true,
            message: "Cuenta creada correctamente.",
            redirect: isOwner ? "/hub" : "/settings" // Empleado va a ajustes a ver invitaciones
        }), { status: 200 });

    } catch (err) {
        console.error("Error general registro:", err);
        return new Response(JSON.stringify({ error: "Error interno del servidor", details: err.message }), { status: 500 });
    }
}