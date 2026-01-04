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
        const { email, role, slug } = await request.json(); // Enviamos el slug desde el cliente para verificar contexto
        if (!email || !role || !slug) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

        // 3. Verify Permissions (Is user owner of this slug?)
        const tenant = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(slug).first();
        if (!tenant) return new Response(JSON.stringify({ error: "Store not found" }), { status: 404 });

        const membership = await db.prepare("SELECT role FROM memberships WHERE user_id = ? AND tenant_id = ?")
            .bind(userId, tenant.id)
            .first();

        if (!membership || (membership.role !== 'OWNER' && membership.role !== 'MANAGER')) {
            return new Response(JSON.stringify({ error: "No tienes permisos para invitar." }), { status: 403 });
        }

        // 4. Check if invitee exists
        const invitee = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (!invitee) {
            return new Response(JSON.stringify({ error: "El usuario no existe en TuStock. Debe registrarse primero." }), { status: 404 });
        }

        // 5. Insert Invitation
        try {
            const mId = crypto.randomUUID();
            // Try inserting with PENDING status
            await db.prepare("INSERT INTO memberships (id, user_id, tenant_id, role, status) VALUES (?, ?, ?, ?, 'PENDING')")
                .bind(mId, invitee.id, tenant.id, role)
                .run();

            return new Response(JSON.stringify({ success: true, message: `Invitación enviada a ${email}` }), { status: 200 });

        } catch (err) {
            // Check for duplicate
            if (err.message.includes("UNIQUE")) {
                return new Response(JSON.stringify({ error: "El usuario ya es miembro." }), { status: 409 });
            }
            // Fallback for legacy schema (no status column)
            try {
                await db.prepare("INSERT INTO memberships (id, user_id, tenant_id, role) VALUES (?, ?, ?, ?)")
                    .bind(crypto.randomUUID(), invitee.id, tenant.id, role)
                    .run();
                return new Response(JSON.stringify({ success: true, message: "Usuario añadido (Legacy Mode)." }), { status: 200 });
            } catch (e2) {
                return new Response(JSON.stringify({ error: "Error al añadir usuario." }), { status: 500 });
            }
        }

    } catch (e) {
        console.error("Invite API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
