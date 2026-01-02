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
    // 2. LISTA BLANCA GLOBAL
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
    // 3. LÓGICA DE TIENDA (Buscando en tabla 'tenants')
    // ------------------------------------------------------------------------
    if (isStoreContext) {

        // 🔥 FIX: Cargamos los datos SIEMPRE, incluso si va a /store/...
        // Para que Astro.locals.currentShop esté disponible en las páginas internas

        let shopData: any = null; 
        
        // OPCIÓN A: D1 (Cloudflare Database) - PRIORIDAD
        // -------------------------------------------------------
        if (env.DB) {
            try {
                // 🔥 CAMBIO: Buscamos en 'tenants' usando 'slug'
                const shop = await env.DB.prepare(
                    "SELECT name, web_plan, slug FROM tenants WHERE slug = ? LIMIT 1"
                ).bind(subdomain).first();

                if (shop) {
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    
                    shopData = {
                        name: (shop.name as string) || 'Tienda',
                        web_plan: rawWebPlan.toUpperCase().trim(), 
                        slug: (shop.slug as string),
                        isStore: true
                    };
                    context.locals.currentShop = shopData;
                }
            } catch (e) {
                console.error("Error Middleware D1:", e);
            }
        }

        // OPCIÓN B: TURSO (Fallback por si D1 falla o no está)
        // -------------------------------------------------------
        if (!shopData && env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                
                // 🔥 CAMBIO: Misma consulta corregida para Turso
                const result = await turso.execute({
                    sql: "SELECT name, web_plan, slug FROM tenants WHERE slug = ? LIMIT 1",
                    args: [subdomain]
                });

                if (result.rows.length > 0) {
                    const shop = result.rows[0];
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    
                    shopData = {
                        name: (shop.name as string) || 'Tienda',
                        web_plan: rawWebPlan.toUpperCase().trim(), 
                        slug: (shop.slug as string),
                        isStore: true
                    };
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware Turso:", e); 
            }
        }

        // Si no se encuentra -> 404
        if (!shopData) return new Response(`Tienda '${subdomain}' no encontrada`, { status: 404 });

        // --- ENRUTAMIENTO ---

        // Si ya estamos en una ruta interna (/store/...), dejamos pasar
        // PERO ahora ya llevamos currentShop cargado ✅
        if (url.pathname.startsWith('/store')) return next();
        
        // A) ADMIN
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // B) PLAN FREE -> Placeholder
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) PLAN PRO -> Tienda Real
        if (url.pathname === '/' || url.pathname === '') {
            return context.rewrite('/store'); 
        }

        return context.rewrite(`/store${url.pathname}`);
    }

    return next();
});