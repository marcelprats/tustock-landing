import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { storeId, dailyTotal, dataJson } = body;

    // Guardar o Actualizar en D1
    await locals.runtime.env.DB.prepare(`
      INSERT INTO store_snapshots (store_id, is_online, last_seen, daily_total, data_json, updated_at)
      VALUES (?, 1, datetime('now'), ?, ?, datetime('now'))
      ON CONFLICT(store_id) DO UPDATE SET
        is_online = 1,
        last_seen = datetime('now'),
        daily_total = excluded.daily_total,
        data_json = excluded.data_json,
        updated_at = datetime('now')
    `).bind(storeId, dailyTotal, JSON.stringify(dataJson)).run();

    return new Response(JSON.stringify({ ok: true }));

  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
};