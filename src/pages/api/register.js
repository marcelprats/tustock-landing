import { sendTelegramAlert } from '../../utils/notifications';
import bcrypt from 'bcryptjs';
import { hashLicense, encryptLicense } from '../../utils/crypto';
import { createClient } from '@libsql/client/web';

// --- 🛠️ GENERADOR DE LICENCIAS ---
const generateProLicense = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
    const db = env?.DB;

    // 0. Validaciones
    if (!db) return new Response(JSON.stringify({ error: "Error DB Web" }), { status: 500 });
    if (!env.MASTER_KEY || !env.TURSO_DB_URL || !env.TURSO_AUTH_TOKEN) {
        console.error("CRITICAL: Faltan secrets (TURSO o MASTER_KEY)");
        return new Response(JSON.stringify({ error: "Error configuración servidor" }), { status: 500 });
    }

    // 1. Datos del usuario
    const { name, email, password, subdomain } = await request.json();

    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    const fullWebsiteUrl = `https://${subdomain}.tustock.app`;

    // --- 🔐 FASE CRIPTOGRAFÍA ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawLicense = generateProLicense(); 
    const licenseHash = hashLicense(rawLicense);
    const licenseEncrypted = encryptLicense(rawLicense, env.MASTER_KEY);

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // --- 3. VALIDACIONES NEGOCIO ---
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe" }), { status: 409 });
    
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) return new Response(JSON.stringify({ error: "Email ya registrado" }), { status: 409 });

    // --- 4. INSERTAR EN D1 ---
    await db.batch([
        db.prepare("INSERT INTO tenants (id, name, slug, plan_type, status, license_hash, license_encrypted) VALUES (?, ?, ?, 'FREE', 'ACTIVE', ?, ?)").bind(tenantId, name, subdomain, licenseHash, licenseEncrypted),
        db.prepare("INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)").bind(userId, email, hashedPassword, name),
        db.prepare("INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')").bind(membershipId, userId, tenantId)
    ]);

    // --- 5. 🚀 INSERTAR EN TURSO ---
    try {
        const turso = createClient({
            url: env.TURSO_DB_URL,
            authToken: env.TURSO_AUTH_TOKEN
        });

        await turso.execute({
            sql: `INSERT INTO licenses (
                key, 
                company_name, 
                owner_email, 
                website_url, 
                plan_type, 
                created_at, 
                is_active, 
                token_balance, 
                total_usage,
                hw_id 
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                rawLicense,         
                name,               
                email,             
                fullWebsiteUrl,     
                'FREE',             
                getSqlDate(),       
                1,                  
                100,                
                0,                  
                null                
            ]
        });
        
        console.log(`✅ Turso Sync OK: ${rawLicense}`);

    } catch (tursoError) { // <--- AQUÍ ESTABA EL ERROR (quitado el :any)
        console.error("❌ ERROR CRÍTICO TURSO:", tursoError);
        const alertMsg = `🚨 <b>FALLO SYNC TURSO</b>\nCliente: ${email}\nLicencia: <code>${rawLicense}</code>\nError: ${tursoError.message}`;
        if (locals.runtime?.ctx?.waitUntil) locals.runtime.ctx.waitUntil(sendTelegramAlert(alertMsg, env));
    }

    // --- 6. SESIÓN Y RESPUESTA ---
    cookies.set('session', userId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    const msg = `🚀 <b>NUEVA ALTA TUSTOCK</b>\n\n👤 <b>${name}</b>\n📧 ${email}\n🔗 ${fullWebsiteUrl}\n🔑 <code>${rawLicense}</code>`;
    
    if (locals.runtime?.ctx?.waitUntil) {
        locals.runtime.ctx.waitUntil(sendTelegramAlert(msg, env));
    } else {
        await sendTelegramAlert(msg, env);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada correctamente.",
      redirect: "/hub"
    }), { status: 200 });

  } catch (err) { // <--- AQUÍ TAMBIÉN (quitado el :any)
    console.error("Error general registro:", err);
    return new Response(JSON.stringify({ error: "Error del servidor", details: err.message }), { status: 500 });
  }
}