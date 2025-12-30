import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    
    // Detectamos el host (Cloudflare Worker o Local)
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    let subdomain = '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    // 1. EXTRAER SUBDOMINIO
    if (isLocalhost) {
        subdomain = url.searchParams.get('tenant') || ''; 
    } else {
        const parts = host.split('.');
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    // 2. DEFINIR SI ES CONTEXTO TIENDA
    const systemSubdomains = ['www', 'app', 'api', 'admin', ''];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        // 🚩 REWRITE INTERNO: 
        // Si el usuario pide "/contacto", nosotros le servimos internamente "/store/contacto"
        // Si pide "/", servimos "/store"
        const targetPath = url.pathname === '/' ? '/store' : `/store${url.pathname}`;

        // Definimos qué rutas NO deben ser sobreescritas (rutas de sistema)
        const systemPaths = ['/admin', '/api', '/settings', '/login'];
        const isSystemPath = systemPaths.some(p => url.pathname.startsWith(p));

        if (!isSystemPath) {
            // Esto hace que Andrea vea /store/index.astro pero en su barra de direcciones ponga solo "/"
            return context.rewrite(targetPath);
        }

        // 3. BUSCAR DATOS DE LA TIENDA (Para que estén disponibles en todas las páginas de /store)
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
                    context.locals.currentShop = {
                        name: (shop.company_name as string) || '',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        url: fullUrl,
                        slug: subdomain,
                        isStore: true
                    };
                } else {
                    return new Response(`La tienda '${subdomain}' no existe o no está activa.`, { status: 404 });
                }
            } catch (e) {
                console.error("Error Middleware Turso:", e);
            }
        }
    }

    return next();
});