import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    // ------------------------------------------------------------------------
    // 1. DETECCIÓN DE SUBDOMINIO
    // ------------------------------------------------------------------------
    let subdomain = '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    if (isLocalhost) {
        subdomain = url.searchParams.get('tenant') || ''; 
    } else {
        const parts = host.split('.');
        if (parts.length >= 3) subdomain = parts[0];
    }

    const systemSubdomains = ['www', 'app', 'api', 'admin', 'hub'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    // ------------------------------------------------------------------------
    // 2. LISTA BLANCA GLOBAL (CRÍTICO: SALVAR LOGOUT Y ASSETS)
    // ------------------------------------------------------------------------
    if (
        url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2|woff|ttf)$/) || 
        url.pathname.startsWith('/_astro') ||
        url.pathname.startsWith('/_image') ||
        url.pathname.startsWith('/favicon') ||
        ['/api', '/login', '/logout', '/register'].some(p => url.pathname.startsWith(p))
    ) {
        return next();
    }

    // ------------------------------------------------------------------------
    // 3. LÓGICA DE TIENDA (Solo si es un subdominio válido)
    // ------------------------------------------------------------------------
    if (isStoreContext) {
        
        // Evitar bucles: Si ya estamos en una ruta interna reescrita, pasamos.
        if (url.pathname.startsWith('/store')) return next();

        let shopData: any = null; 
        
        if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                
                const result = await turso.execute({
                    sql: "SELECT company_name, owner_email, plan_type, web_plan FROM licenses WHERE website_url LIKE ? LIMIT 1",
                    args: [`%${subdomain}%`]
                });

                if (result.rows.length > 0) {
                    const shop = result.rows[0];
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    shopData = {
                        name: (shop.company_name as string) || 'Tienda',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, 
                        slug: subdomain,
                        isStore: true
                    };
                    
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        if (!shopData) return new Response(`Tienda '${subdomain}' no encontrada`, { status: 404 });

        // --- ENRUTAMIENTO (REWRITES) ---
        
        // A) ADMIN -> Panel de Control
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // B) PLAN FREE -> Placeholder (Bloqueo de tienda)
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) PLAN PRO -> Tienda Real
        // 🔥 FIX: Reescribir a la CARPETA '/store' en lugar de '/store/index'
        // Esto permite que Astro resuelva el index.astro correctamente.
        if (url.pathname === '/' || url.pathname === '') {
            return context.rewrite('/store'); 
        }

        return context.rewrite(`/store${url.pathname}`);
    }

    return next();
});