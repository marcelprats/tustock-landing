import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";
import { shopNavigation } from "./navigation";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    let subdomain = '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    if (isLocalhost) {
        subdomain = url.searchParams.get('tenant') || ''; 
    } else {
        const parts = host.split('.');
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    const systemSubdomains = ['www', 'app', 'api', 'admin', ''];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    // 🚩 LÓGICA DE WHITELIST PARA TIENDAS
    if (isStoreContext) {
        // Miramos si la página actual está en la Whitelist de navigation.ts
        const isPathAllowed = shopNavigation.allowedPaths.some(allowed => 
            url.pathname === allowed || url.pathname.startsWith('/api/')
        );

        if (!isPathAllowed) {
            // Si no está permitida (ej: /about), lo mandamos al main del subdominio
            return context.redirect('/'); 
        }

        // BUSCAR TIENDA EN TURSO
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
                    // ASIGNACIÓN SEGURA CON TIPOS
                    context.locals.currentShop = {
                        name: (shop.company_name as string) || '',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        url: fullUrl,
                        slug: subdomain,
                        isStore: true
                    };
                } else {
                    return new Response(`Tienda '${subdomain}' no encontrada`, { status: 404 });
                }
            } catch (e) {
                console.error("Error Middleware DB:", e);
            }
        }
    }

    return next();
});