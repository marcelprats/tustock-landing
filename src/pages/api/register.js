import { sendTelegramAlert } from '../../utils/notifications';
import bcrypt from 'bcryptjs';
import { generateLicenseKey, hashLicense, encryptLicense } from '../../utils/crypto';

export const POST = async ({ request, locals, cookies }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB;

    // 0. Validar conexión a DB y Clave Maestra
    if (!db) return new Response(JSON.stringify({ error: "Error de conexión a DB" }), { status: 500 });
    
    // IMPORTANTE: Si no has configurado la variable en Cloudflare, esto te avisará
    if (!env.MASTER_KEY) {
        console.error("CRITICAL: Faltan variables de entorno (MASTER_KEY)");
        return new Response(JSON.stringify({ error: "Error de configuración del servidor" }), { status: 500 });
    }

    const { name, email, password, subdomain } = await request.json();

    if (!name || !email || !password || !subdomain) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // --- 🔐 FASE DE SEGURIDAD ---
    
    // 1. Encriptar Contraseña (Bcrypt) -> Irreversible
    // El 10 es el coste de CPU (salt rounds), suficiente para seguridad actual
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Generar Licencia Blindada (Doble Columna)
    const rawLicense = generateLicenseKey(); // La clave real (ej: ts_a1b2...)
    const licenseHash = hashLicense(rawLicense); // Para buscar rápido (SHA256)
    const licenseEncrypted = encryptLicense(rawLicense, env.MASTER_KEY); // Para guardar seguro (AES)

    // ----------------------------

    // Generamos IDs únicos para la BBDD
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // 3. VALIDACIONES PREVIAS
    // A. ¿Existe la tienda?
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(subdomain).first();
    if (existingTenant) {
        return new Response(JSON.stringify({ error: "Ese nombre de tienda ya existe 😢" }), { status: 409 });
    }
    
    // B. ¿Existe el usuario?
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Este email ya está registrado. Por favor, inicia sesión." }), { status: 409 });
    }

    // --- 4. BLOQUE DE INSERCIÓN (ATÓMICO) ---
    // Idealmente usaríamos db.batch(), pero lo hacemos secuencial por claridad
    
    // A. Crear Tienda (Guardamos el HASH y la ENCRIPTADA, nunca la plana)
    await db.prepare(
      "INSERT INTO tenants (id, name, slug, plan_type, status, license_hash, license_encrypted) VALUES (?, ?, ?, 'FREE', 'PENDING', ?, ?)"
    ).bind(tenantId, name, subdomain, licenseHash, licenseEncrypted).run();

    // B. Crear Usuario (Guardamos el HASH de la password)
    await db.prepare(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, hashedPassword, name).run();

    // C. Crear Membresía (Dueño)
    await db.prepare(
      "INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, 'OWNER')"
    ).bind(membershipId, userId, tenantId).run();

    // --- FIN BLOQUE INSERCIÓN ---

    // 5. CREAR SESIÓN (Cookie)
    cookies.set('session', userId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      domain: import.meta.env.PROD ? '.tustock.app' : undefined
    });

    // 6. NOTIFICACIÓN A TELEGRAM
    const msg = `🚀 <b>NUEVO REGISTRO SECURE</b>\n\n👤 Usuario: ${name} (${email})\n🏪 Tienda: ${name}\n🔗 Slug: <code>${subdomain}</code>`;
    
    // Usamos waitUntil para no bloquear la respuesta al usuario
    if (locals.runtime?.ctx?.waitUntil) {
        locals.runtime.ctx.waitUntil(sendTelegramAlert(msg, env));
    } else {
        await sendTelegramAlert(msg, env);
    }

    // 7. RESPUESTA EXITOSA
    return new Response(JSON.stringify({
      success: true,
      message: "Cuenta creada con éxito.",
      redirect: "/hub"
    }), { status: 200 });

  } catch (err) {
    console.error("Error en registro:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor", details: err.message }), { status: 500 });
  }
}
