import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    // 1. DETECTAR SUBDOMINIO
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
    // Si tiene subdominio y no es uno del sistema, ES UNA TIENDA
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        // 🛑 GUARDIA ANTI-BUCLE (CRÍTICO)
        // Si Astro ya ha reescrito la url a /store/..., dejamos que pase y renderice la página.
        // Sin esto, vuelve a entrar aquí y se crea el bucle infinito.
        if (url.pathname.startsWith('/store')) {
            return next();
        }

        // 2. EXCEPCIONES: Rutas que NO queremos redirigir a /store
        // Por ejemplo, las APIs de login o el panel de admin si es común
        const systemPaths = ['/admin', '/api', '/settings', '/login'];
        const isSystemPath = systemPaths.some(p => url.pathname.startsWith(p));

        if (!isSystemPath) {
            // 3. REWRITE MÁGICO ✨
            // Transformamos la petición del usuario para que apunte a la carpeta /store
            // Ejemplo: "/" -> "/store"
            // Ejemplo: "/contacto" -> "/store/contacto"
            const targetPath = `/store${url.pathname === '/' ? '' : url.pathname}`;
            
            // Inyectamos datos de la tienda antes de reescribir
            if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
                try {
                    const turso = createClient({
                        url: env.TURSO_DB_URL,
                        authToken: env.TURSO_AUTH_TOKEN
                    });
                    // Usamos LIKE para ser flexibles con www o sin www en la db
                    const fullUrl = `https://${subdomain}.tustock.app`;
                    const result = await turso.execute({
                        sql: "SELECT company_name, owner_email, plan_type FROM licenses WHERE website_url LIKE ? LIMIT 1",
                        args: [`%${subdomain}%`]
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
                         // Si la tienda no existe en DB, podemos devolver 404 aquí mismo
                         // o dejar que renderice /store/index y muestre error genérico
                    }
                } catch (e) {
                    console.error("Error Middleware Turso:", e);
                }
            }

            // Aquí sucede la magia: Astro buscará el archivo en /src/pages/store/...
            return context.rewrite(targetPath);
        }
    }

    return next();
});