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

    // Dominios del sistema que NO son tiendas
    const systemSubdomains = ['www', 'app', 'api', 'admin'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        
        // 🔥 0. SALIDA RÁPIDA (ANTI-LOOP & ASSETS) - CRÍTICO
        // Si la URL ya es interna (/store) o es un archivo estático, DEJAMOS PASAR.
        // Esto evita el error 508 y hace que cargue el CSS.
        if (
            url.pathname.startsWith('/store') || 
            url.pathname.startsWith('/_astro') || 
            url.pathname.startsWith('/_image') || 
            url.pathname.startsWith('/favicon') ||
            url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2)$/)
        ) {
            return next();
        }

        // 2. RUTAS DE SISTEMA (Login/API/Settings)
        // Permite que el login funcione dentro del subdominio si es necesario
        const systemPaths = ['/api', '/login', '/logout', '/settings']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) {
            return next();
        }

        // 3. RECUPERAR DATOS DE LA BASE DE DATOS
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
                    
                    // Normalización del plan (Evita errores por mayúsculas/espacios)
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    shopData = {
                        name: (shop.company_name as string) || '',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, // 'FREE' o 'PRO'
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

        // Si la tienda no existe en BD -> 404
        if (!shopData) {
             return new Response(`La tienda '${subdomain}' no existe en TuStock.`, { status: 404 });
        }

        // 4. LÓGICA DE REESCRITURA (ROUTING)
        
        // A) ADMIN -> Siempre redirige al panel de control real
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // B) PLAN FREE -> Muestra el Placeholder (Bloquea la tienda)
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) PLAN PRO -> Muestra la tienda real
        // "/" -> "/store/index"
        const targetPath = url.pathname === '/' ? '/store' : `/store${url.pathname}`;
        return context.rewrite(targetPath);
    }

    return next();
});