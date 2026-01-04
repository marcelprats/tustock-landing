export const POST = async ({ request, locals, cookies }) => {
    try {
        const env = locals.runtime?.env;
        const db = env?.DB;

        // 1. Session Check
        const session = cookies.get('session');
        if (!session || !session.value) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const userId = session.value;

        if (!db) return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });

        // 2. Parse Body
        const { newName, slug } = await request.json();
        if (!newName || !slug || newName.length < 3) {
            return new Response(JSON.stringify({ error: "Nombre inválido (mínimo 3 caracteres)" }), { status: 400 });
        }

        // 3. Verify Permissions (Is user owner of this slug?)
        const tenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(slug).first();
        if (!tenant) return new Response(JSON.stringify({ error: "Store not found" }), { status: 404 });

        const membership = await db.prepare("SELECT role FROM memberships WHERE user_id = ? AND tenant_id = ?")
            .bind(userId, tenant.id)
            .first();

        if (!membership || membership.role !== 'OWNER') {
            return new Response(JSON.stringify({ error: "Solo el propietario puede cambiar el nombre." }), { status: 403 });
        }

        // 4. Update
        await db.prepare("UPDATE tenants SET name = ? WHERE id = ?").bind(newName, tenant.id).run();

        return new Response(JSON.stringify({ success: true, message: "Nombre actualizado." }), { status: 200 });

    } catch (e) {
        console.error("Update API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
