// src/utils/notifications.js

/**
 * Envía alerta a Telegram
 */
export async function sendTelegramAlert(message, env) {
  const token = env.TELEGRAM_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("⚠️ Faltan credenciales de Telegram");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error("Error Telegram:", e);
  }
}

/**
 * Envía Email usando Resend.com
 */
export async function sendWelcomeEmail(toEmail, storeName, env) {
  const resendKey = env.RESEND_API_KEY;

  if (!resendKey) {
    console.warn("⚠️ Falta RESEND_API_KEY");
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TuStock <onboarding@resend.dev>', // Si tienes dominio verificado: hola@tustock.app
        to: [toEmail],
        subject: `🚀 ${storeName} está en proceso`,
        html: `
          <h1>¡Hola! 👋</h1>
          <p>Hemos recibido tu solicitud para crear <strong>${storeName}</strong>.</p>
          <p>Nuestros sistemas están configurando tu servidor y el dominio.</p>
          <p>⏳ <strong>Tiempo estimado:</strong> Menos de 24h.</p>
          <p>Te avisaremos cuando esté lista (verás la luz verde en tu Hub).</p>
          <br>
          <p>Atte: El equipo de TuStock.</p>
        `
      })
    });
    
    const data = await res.json();
    console.log("Email enviado:", data);
    
  } catch (e) {
    console.error("Error Resend:", e);
  }
}
