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
    // Esta sección DEBE ir antes de conectar a la base de datos o verificar tiendas.
    // Si la URL es un recurso estático o una ruta de sistema (API/Login/Logout),
    // dejamos pasar la petición inmediatamente.
    if (
        url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2|woff|ttf)$/) || 
        url.pathname.startsWith('/_astro') ||
        url.pathname.startsWith('/_image') ||
        url.pathname.startsWith('/favicon') ||
        // 🔥 IMPORTANTE: Dejar pasar logout ANTES de comprobar tienda
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
        
        // Conexión a Base de Datos (Turso / LibSQL)
        if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                
                // Buscamos la tienda por su URL
                const result = await turso.execute({
                    sql: "SELECT company_name, owner_email, plan_type, web_plan FROM licenses WHERE website_url LIKE ? LIMIT 1",
                    args: [`%${subdomain}%`]
                });

                if (result.rows.length > 0) {
                    const shop = result.rows[0];
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    // 🛑 DEBUG: Útil para ver en los logs de Cloudflare si detecta bien el plan
                    // console.log(`[Middleware] ${subdomain} -> Plan: ${webPlanNormalized}`);

                    shopData = {
                        name: (shop.company_name as string) || 'Tienda',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, 
                        slug: subdomain,
                        isStore: true
                    };
                    
                    // Guardamos los datos en locals para usarlos en los componentes (.astro)
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        // Si la tienda no existe en la BD, devolvemos 404
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
        // 🔥 FIX: Forzamos /index para asegurar que Astro carga el archivo correcto
        // si la petición es a la raíz.
        const targetPath = (url.pathname === '/' || url.pathname === '') 
            ? '/store/index' 
            : `/store${url.pathname}`;
            
        return context.rewrite(targetPath);
    }

    // Si no es tienda ni sistema, cargamos la Landing Page normal
    return next();
});