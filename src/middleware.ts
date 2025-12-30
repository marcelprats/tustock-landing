import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    // 1. OBTENER LAS VARIABLES DE ENTORNO (Cloudflare)
    const env = context.locals.runtime?.env || import.meta.env;
    
    // 2. DETECTAR EL DOMINIO
    const url = new URL(context.request.url);
    // El worker nos pasa el dominio original en esta cabecera
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    let subdomain = '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    // 3. EXTRAER SUBDOMINIO
    if (isLocalhost) {
        // subdomain = 'fruteria-paco'; // Descomenta para probar en local
        subdomain = ''; 
    } else {
        // 'fruteria.tustock.app' -> ['fruteria', 'tustock', 'app']
        const parts = host.split('.');
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    // 4. IGNORAR SUBDOMINIOS DEL SISTEMA
    const systemSubdomains = ['www', 'app', 'api', 'admin', ''];
    if (systemSubdomains.includes(subdomain)) {
        return next(); // Pasa de largo, muestra la landing
    }

    // 5. BUSCAR EN TURSO
    if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
        try {
            const turso = createClient({
                url: env.TURSO_DB_URL,
                authToken: env.TURSO_AUTH_TOKEN
            });

            const fullUrl = `https://${subdomain}.tustock.app`;
            
            const result = await turso.execute({
                sql: "SELECT company_name, owner_email, plan_type FROM licenses WHERE website_url = ? LIMIT 1",
                args: [fullUrl]
            });

            if (result.rows.length > 0) {
                const shop = result.rows[0];
                // GUARDAMOS LOS DATOS EN LOCALS
                context.locals.currentShop = {
                    name: shop.company_name as string,
                    email: shop.owner_email as string,
                    plan: shop.plan_type as string,
                    url: fullUrl
                };
            } else {
                // TIENDA NO ENCONTRADA (404)
                return new Response(`Tienda '${subdomain}' no encontrada`, { status: 404 });
            }
        } catch (e) {
            console.error("Error Middleware DB:", e);
        }
    }

    return next();
});