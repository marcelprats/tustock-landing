// src/utils/notifications.js

export async function sendTelegramAlert(message, env) {
  // Intentamos obtener las variables del entorno
  const token = env.TELEGRAM_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("❌ Faltan credenciales de Telegram (TELEGRAM_TOKEN o TELEGRAM_CHAT_ID)");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // Para poder usar negritas <b> y código <code>
      })
    });

    const data = await response.json();
    if (!data.ok) {
        console.error("Error respuesta Telegram:", data);
    } else {
        console.log("✅ Notificación Telegram enviada");
    }
  } catch (e) {
    console.error("Error enviando Telegram:", e);
  }
}
