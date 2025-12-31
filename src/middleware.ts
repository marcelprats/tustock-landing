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
        // En local usamos ?tenant=nombre
        subdomain = url.searchParams.get('tenant') || ''; 
    } else {
        const parts = host.split('.');
        // Si hay 3 partes (ej: paco.tustock.app), la primera es el subdominio
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    // Lista de subdominios reservados que NO son tiendas
    const systemSubdomains = ['www', 'app', 'api', 'admin', 'hub'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    // ------------------------------------------------------------------------
    // 2. LÓGICA DE TIENDA (Solo si estamos en un subdominio válido)
    // ------------------------------------------------------------------------
    if (isStoreContext) {
        
        // 🔥 0. SALIDA RÁPIDA (CRÍTICO: ANTI-LOOP Y ASSETS)
        // Si la URL ya ha sido reescrita a /store o es un archivo estático, 
        // DEJAMOS PASAR INMEDIATAMENTE. Sin esto, el CSS falla y da Error 508.
        if (
            url.pathname.startsWith('/store') || 
            url.pathname.startsWith('/_astro') || 
            url.pathname.startsWith('/_image') || 
            url.pathname.startsWith('/favicon') ||
            url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2|woff|ttf)$/)
        ) {
            return next();
        }

        // 2. EXCEPCIÓN DE RUTAS DE SISTEMA
        // Permitimos login, logout y API aunque estemos en un subdominio
        const systemPaths = ['/api', '/login', '/logout', '/register']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) {
            return next();
        }

        // 3. RECUPERAR DATOS DE LA TIENDA DESDE TURSO/D1
        let shopData: any = null; 

        if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                
                const result = await turso.execute({
                    sql: "SELECT company_name, owner_email, plan_type, web_plan FROM licenses WHERE website_url LIKE ? LIMIT 1",
                    args: [`%${subdomain}%`] // Buscamos coincidencia parcial o exacta
                });

                if (result.rows.length > 0) {
                    const shop = result.rows[0];
                    
                    // --- NORMALIZACIÓN ROBUSTA DEL PLAN ---
                    // Convierte "Pro ", "pro", null -> "PRO" o "FREE" limpio.
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    shopData = {
                        name: (shop.company_name as string) || 'Tienda',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, // Aquí ya tenemos 'FREE' o 'PRO' limpio
                        slug: subdomain,
                        isStore: true
                    };
                    
                    // Guardamos en locals para usarlo en los componentes (Astro.locals.currentShop)
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        // Si la tienda no existe en BD -> Error 404
        if (!shopData) {
             return new Response(`La tienda '${subdomain}' no está activa en TuStock.`, { status: 404 });
        }

        // 4. LÓGICA DE REESCRITURA (ROUTING INTELIGENTE)
        
        // A) ACCESO AL ADMIN (/admin)
        // Redirige siempre al panel de control real (/store/admin)
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // B) PLAN FREE -> PLACEHOLDER
        // Si el plan no es PRO, bloqueamos la tienda y mostramos la página de espera
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) PLAN PRO -> TIENDA REAL
        // Si llegamos aquí, es PRO. Mostramos la tienda.
        // Si es la raíz "/", servimos explícitamente el index.
        const targetPath = url.pathname === '/' || url.pathname === '' 
            ? '/store/index' 
            : `/store${url.pathname}`;
            
        return context.rewrite(targetPath);
    }

    // Si no es un subdominio de tienda, seguimos normal (Landing Page principal)
    return next();
});