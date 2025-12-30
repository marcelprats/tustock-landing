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

    const systemSubdomains = ['www', 'app', 'api', 'admin'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        // 🛑 Evitar bucles internos
        if (url.pathname.startsWith('/store')) return next();

        // 2. RUTAS DE SISTEMA (Login/API/Settings) pasan siempre
        const systemPaths = ['/api', '/login', '/settings']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) {
            return next();
        }

        // 3. RECUPERAR DATOS Y PLAN
        // Inicializamos como 'any' para evitar que TS se queje si empieza en null
        let shopData: any = null; 

        if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                const fullUrl = `https://${subdomain}.tustock.app`;
                
                // Leemos web_plan
                const result = await turso.execute({
                    sql: "SELECT company_name, owner_email, plan_type, web_plan FROM licenses WHERE website_url LIKE ? LIMIT 1",
                    args: [`%${subdomain}%`]
                });

                if (result.rows.length > 0) {
                    const shop = result.rows[0];
                    shopData = {
                        name: (shop.company_name as string) || '',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: (shop.web_plan as string) || 'FREE', // Default FREE
                        url: fullUrl,
                        slug: subdomain,
                        isStore: true
                    };
                    // Guardamos en locals para usarlo en los componentes
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        // Si no se encontró la tienda en BD, 404
        if (!shopData) {
             return new Response(`La tienda '${subdomain}' no existe.`, { status: 404 });
        }

        // 4. LÓGICA DE REWRITE (REDIRECCIONES INTERNAS)
        
        // A) ¿Quiere entrar al ADMIN? -> Lo mandamos al Dashboard real (/store/admin)
        if (url.pathname.startsWith('/admin')) {
            return context.rewrite('/store/admin');
        }

        // B) ¿Es plan FREE? -> Solo mostramos el Placeholder
        if (shopData.web_plan === 'FREE') {
            // El usuario ve 'paco.tustock.app' pero servimos 'store/placeholder'
            return context.rewrite('/store/placeholder');
        }

        // C) ¿Es plan PREMIUM/PRO? -> Mostramos la tienda real
        const targetPath = url.pathname === '/' ? '/store' : `/store${url.pathname}`;
        return context.rewrite(targetPath);
    }

    return next();
});