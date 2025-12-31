import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    // --- 1. DETECCIÓN DE SUBDOMINIO ---
    let subdomain = '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    if (isLocalhost) {
        subdomain = url.searchParams.get('tenant') || ''; 
    } else {
        const parts = host.split('.');
        // Si hay 3 partes (ej: paco.tustock.app), la primera es el subdominio
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    // Lista de subdominios reservados (Sistema)
    const systemSubdomains = ['www', 'app', 'api', 'admin', 'hub'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    // --- 2. LÓGICA DE TIENDA ---
    if (isStoreContext) {
        
        // 🔥 0. SALIDA RÁPIDA (ANTI-LOOP & ASSETS)
        // Dejamos pasar archivos estáticos y rutas ya reescritas para evitar el Error 508
        if (
            url.pathname.startsWith('/store') || 
            url.pathname.startsWith('/_astro') || 
            url.pathname.startsWith('/_image') || 
            url.pathname.startsWith('/favicon') ||
            url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2|woff|ttf)$/)
        ) {
            return next();
        }

        // 1. EXCEPCIÓN DE RUTAS DE SISTEMA
        // Es vital incluir '/api' y '/logout' aquí para que el middleware no bloquee el cierre de sesión
        const systemPaths = ['/api', '/login', '/logout', '/register']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) {
            return next();
        }

        // 2. RECUPERAR DATOS DE LA TIENDA
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
                    
                    // Normalización del plan (quita espacios y mayúsculas)
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    shopData = {
                        name: (shop.company_name as string) || 'Tienda',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, // 'FREE' o 'PRO'
                        slug: subdomain,
                        isStore: true
                    };
                    
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        if (!shopData) {
             return new Response(`La tienda '${subdomain}' no existe.`, { status: 404 });
        }

        // --- 3. ENRUTAMIENTO (ROUTING) ---
        
        // A) ADMIN -> Panel de Control
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // B) PLAN FREE -> Placeholder (Bloqueo)
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) PLAN PRO -> Tienda Real
        // Corrección: Si es la raíz "/", Astro prefiere reescribir a "/store" (carpeta) 
        // y él solito busca el index.astro dentro.
        const targetPath = url.pathname === '/' || url.pathname === '' 
            ? '/store' 
            : `/store${url.pathname}`;
            
        return context.rewrite(targetPath);
    }

    return next();
});