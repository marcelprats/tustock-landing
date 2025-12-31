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
        // Si hay 3 partes (ej: paco.tustock.app), el subdominio es la primera
        if (parts.length >= 3) {
            subdomain = parts[0];
        }
    }

    // Lista de subdominios reservados que NO son tiendas
    const systemSubdomains = ['www', 'app', 'api', 'admin'];
    const isStoreContext = subdomain !== '' && !systemSubdomains.includes(subdomain);

    if (isStoreContext) {
        // 🛑 EVITAR BUCLES Y ARCHIVOS ESTÁTICOS
        // Si ya estamos en /store o es un asset (imagen, css), dejamos pasar.
        if (url.pathname.startsWith('/store') || url.pathname.match(/\.(css|js|jpg|png|svg|ico|json)$/)) {
            return next();
        }

        // 2. RUTAS DE SISTEMA (Login/API/Settings) pasan siempre
        const systemPaths = ['/api', '/login', '/settings']; 
        if (systemPaths.some(p => url.pathname.startsWith(p))) {
            return next();
        }

        // 3. RECUPERAR DATOS Y PLAN DE LA TIENDA
        let shopData: any = null; 

        if (env.TURSO_DB_URL && env.TURSO_AUTH_TOKEN) {
            try {
                const turso = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_AUTH_TOKEN });
                
                // Buscamos la tienda por su URL completa o parcial
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
                        // Si web_plan es null en la BD, lo tratamos como 'FREE' por defecto
                        web_plan: (shop.web_plan as string) || 'FREE', 
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

        // Si no se encontró la tienda en BD, devolvemos 404
        if (!shopData) {
             return new Response(`La tienda '${subdomain}' no existe en TuStock.`, { status: 404 });
        }

        // 4. LÓGICA DE REWRITE (LA MAGIA) 🪄
        
        // A) ¿Quiere entrar al ADMIN? -> Lo mandamos al panel de gestión (/store/admin)
        // Esto funciona SIEMPRE, tenga plan Free o Pro.
        if (url.pathname.startsWith('/admin')) {
            return context.rewrite('/store/admin');
        }

        // B) ¿Es plan FREE? -> Bloqueamos la tienda y mostramos el Placeholder
        if (shopData.web_plan === 'FREE') {
            return context.rewrite('/store/placeholder');
        }

        // C) ¿Es plan PREMIUM/PRO? -> Mostramos la tienda real
        // "/" -> "/store/index"
        // "/contacto" -> "/store/contacto"
        const targetPath = url.pathname === '/' ? '/store' : `/store${url.pathname}`;
        return context.rewrite(targetPath);
    }

    return next();
});