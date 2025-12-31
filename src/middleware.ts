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
        if (parts.length >= 3) subdomain = parts[0];
    }

    const systemSubdomains = ['www', 'app', 'api', 'admin'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        
        // 0. EXCEPCIÓN DE ACTIVOS (CSS/JS)
        if (url.pathname.match(/\.(css|js|jpg|png|svg|ico|json|woff2)$/) || url.pathname.startsWith('/_astro')) {
            return next();
        }

        // 2. RUTAS SISTEMA
        const systemPaths = ['/api', '/login', '/settings']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) return next();

        // 3. RECUPERAR DATOS
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
                    
                    // --- 🔥 LÓGICA BLINDADA ---
                    // Normalizamos a mayúsculas y si es null, asumimos 'FREE'
                    const rawWebPlan = (shop.web_plan as string) || 'FREE';
                    const webPlanNormalized = rawWebPlan.toUpperCase().trim(); 

                    shopData = {
                        name: (shop.company_name as string) || '',
                        email: (shop.owner_email as string) || '',
                        plan: (shop.plan_type as string) || 'FREE',
                        web_plan: webPlanNormalized, // Guardamos el valor limpio
                        slug: subdomain,
                        isStore: true
                    };
                    context.locals.currentShop = shopData;
                }
            } catch (e) { 
                console.error("Error Middleware:", e); 
            }
        }

        if (!shopData) return new Response("Tienda no encontrada", { status: 404 });

        // 4. REGLAS DE TRÁFICO
        
        // A) ADMIN siempre entra
        if (url.pathname.startsWith('/admin')) {
            return context.rewrite('/store/admin');
        }

        // B) SI ES FREE -> PLACEHOLDER (Sin excepción)
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) CUALQUIER OTRA COSA (PRO, PREMIUM, ENTERPRISE) -> TIENDA
        const targetPath = url.pathname === '/' ? '/store' : `/store${url.pathname}`;
        return context.rewrite(targetPath);
    }

    return next();
});