import { defineMiddleware } from "astro:middleware";
import { createClient } from "@libsql/client/web";

export const onRequest = defineMiddleware(async (context, next) => {
    const env = context.locals.runtime?.env || import.meta.env;
    const url = new URL(context.request.url);
    const host = context.request.headers.get("x-forwarded-host") || url.host;
    
    // 1. DETECCIÓN
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

    // 2. LISTA BLANCA GLOBAL (Salvar Logout y Assets)
    if (
        url.pathname.match(/\.(css|js|jpg|jpeg|png|svg|ico|json|woff2)$/) || 
        url.pathname.startsWith('/_astro') ||
        url.pathname.startsWith('/favicon') ||
        // 🔥 IMPORTANTE: Dejar pasar logout ANTES de comprobar tienda
        ['/api', '/login', '/logout', '/register'].some(p => url.pathname.startsWith(p))
    ) {
        return next();
    }

    // 3. LÓGICA TIENDA
    if (isStoreContext) {
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

                    // 🛑 DEBUG: Mira esto en los logs de Cloudflare si falla
                    console.log(`[Middleware] ${subdomain} -> Plan: ${webPlanNormalized}`);

                    shopData = {
                        name: (shop.company_name as string) || 'Tienda',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, 
                        slug: subdomain,
                        isStore: true
                    };
                    context.locals.currentShop = shopData;
                }
            } catch (e) { console.error(e); }
        }

        if (!shopData) return new Response(`Tienda no encontrada`, { status: 404 });

        // --- RUTAS ---
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
            return context.rewrite('/store/admin');
        }

        // SI ES FREE -> Placeholder
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // SI ES PRO -> Tienda Real
        // 🔥 Forzamos /index para asegurar que Astro carga el archivo correcto
        const targetPath = (url.pathname === '/' || url.pathname === '') 
            ? '/store/index' 
            : `/store${url.pathname}`;
            
        return context.rewrite(targetPath);
    }

    return next();
});