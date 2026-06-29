// Envío de propuesta por correo (Resend). La API key vive en process.env.RESEND_API_KEY (Vercel), nunca en el repo.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend no configurado (falta RESEND_API_KEY)' })
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const email = String(b.email || '').trim()
    if (!email) return res.status(400).json({ error: 'Falta el email del cliente' })

    const tipoEvento = esc(b.tipoEvento || 'Evento')
    const personas = esc(b.personas != null ? b.personas : '')
    const fecha = esc(b.fecha || '')
    const totalFmt = '$' + Number(b.total || 0).toLocaleString('es-MX')

    // Desglose de lo que incluye la inversión (lista de servicios, enviada desde precio.html)
    const incluyeArr = Array.isArray(b.incluye) ? b.incluye : []
    const incluyeRows = incluyeArr.map((it) => `<tr><td valign="top" style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#d8d4cc;line-height:1.5;padding:9px 0;border-bottom:1px solid rgba(184,147,90,0.12);"><span style="color:#B8935A;font-weight:700;">&middot;</span>&nbsp;&nbsp;${esc(it)}</td></tr>`).join('')
    const incluyeHtml = incluyeArr.length ? `<p style="margin:32px 0 10px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#9aa39b;">Lo que incluye</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${incluyeRows}</table>` : ''

    const FROM = 'El Romeral <propuestas@experiencias-romeral.com>'
    const CAL = 'https://cal.com/ricardo-heredia-jxuu3m/presencial?overlayCalendar=true'
    const WA = 'https://wa.me/523338708159?text=' + encodeURIComponent('Hola, acabo de recibir mi propuesta de El Romeral y quiero que un asesor me contacte.')
    const MAPS = 'https://maps.app.goo.gl/iFqUS9cJkDdY6oiT9'
    // MODO PRUEBA (sandbox de Resend): sin dominio verificado solo se puede enviar al dueño de la cuenta.
    // Redirige TODOS los correos a esta dirección. Poner null cuando el dominio esté verificado en Resend.
    const SANDBOX_TO = 'ricardoheredia2012@hotmail.com'

    // ---------- Email al cliente: dark, bulletproof (tablas + estilos inline + botón bulletproof) ----------
    const clientHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark only"></head>
<body style="margin:0;padding:0;background-color:#0D1A12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D1A12" style="background-color:#0D1A12;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
  <tr><td align="center" style="padding:6px 0 26px;">
    <span style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:6px;color:#B8935A;">EL ROMERAL</span>
  </td></tr>
  <tr><td bgcolor="#13241A" style="background-color:#13241A;border:1px solid rgba(184,147,90,0.25);border-radius:6px;padding:36px 32px;">
    <p style="margin:0 0 6px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#9aa39b;">Su propuesta</p>
    <h1 style="margin:0 0 26px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:26px;font-weight:400;color:#F5F1EB;line-height:1.25;">Su propuesta de experiencia</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#b9bdb6;padding:7px 0;border-bottom:1px solid rgba(184,147,90,0.14);">Tipo de evento</td>
        <td align="right" style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EB;padding:7px 0;border-bottom:1px solid rgba(184,147,90,0.14);">${tipoEvento}</td>
      </tr>
      <tr>
        <td style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#b9bdb6;padding:7px 0;border-bottom:1px solid rgba(184,147,90,0.14);">Fecha</td>
        <td align="right" style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EB;padding:7px 0;border-bottom:1px solid rgba(184,147,90,0.14);">${fecha}</td>
      </tr>
      <tr>
        <td style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#b9bdb6;padding:7px 0;">Invitados</td>
        <td align="right" style="font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EB;padding:7px 0;">${personas}</td>
      </tr>
    </table>
    <p style="margin:28px 0 4px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#9aa39b;text-align:center;">Inversión estimada</p>
    <p style="margin:0;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:46px;font-weight:700;color:#B8935A;text-align:center;line-height:1.05;">${totalFmt}</p>
    <p style="margin:22px 0 4px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:15px;color:#d8d4cc;text-align:center;line-height:1.6;">Esta es la base de su experiencia. A partir de aquí, la personalizamos juntos.</p>
    ${incluyeHtml}
    <div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
      <td align="center" bgcolor="#B8935A" style="background-color:#B8935A;border-radius:3px;">
        <a href="${CAL}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;color:#0D1A12;text-decoration:none;">AGENDAR NUESTRA VISITA &rarr;</a>
      </td>
    </tr></table>
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
      <td align="center" style="border:1px solid rgba(184,147,90,0.5);border-radius:3px;">
        <a href="${WA}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;color:#B8935A;text-decoration:none;">QUIERO QUE ME CONTACTE UN ASESOR</a>
      </td>
    </tr></table>
    <div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border-top:1px solid rgba(184,147,90,0.18);padding-top:22px;">
        <p style="margin:0 0 6px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9aa39b;">WhatsApp</p>
        <p style="margin:0 0 16px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:15px;"><a href="${WA}" target="_blank" style="color:#F5F1EB;text-decoration:none;">+52 33 3870 8159</a></p>
        <p style="margin:0 0 6px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9aa39b;">Dirección</p>
        <p style="margin:0;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:15px;"><a href="${MAPS}" target="_blank" style="color:#B8935A;text-decoration:none;">Ver ubicación en Google Maps &rarr;</a></p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:26px 0 8px;font-family:'Lato',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6f776f;">El Romeral &middot; Zapopan, Jalisco</td></tr>
</table>
</td></tr>
</table>
</body></html>`

    // ---------- Email interno (notificación, simple y legible) ----------
    const internalHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5;">
  <h2 style="margin:0 0 12px;color:#0D1A12;">Nuevo lead · Asesoría Virtual</h2>
  <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr><td style="color:#666;"><b>Email cliente:</b></td><td>${esc(email)}</td></tr>
    <tr><td style="color:#666;"><b>Tipo de evento:</b></td><td>${tipoEvento}</td></tr>
    <tr><td style="color:#666;"><b>Fecha:</b></td><td>${fecha}</td></tr>
    <tr><td style="color:#666;"><b>Invitados:</b></td><td>${personas}</td></tr>
    <tr><td style="color:#666;"><b>Inversión estimada:</b></td><td>${totalFmt}</td></tr>
  </table>
</div>`

    const sendEmail = async (payload) => {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!r.ok) { throw new Error('Resend ' + r.status + ': ' + (await r.text())) }
      return r.json()
    }

    const toClient = SANDBOX_TO || email
    const toInternal = SANDBOX_TO ? SANDBOX_TO : ['richie@netlab.mx', 'rafaelvacaromero@gmail.com']
    const sandboxTag = SANDBOX_TO ? '[PRUEBA] ' : ''

    await Promise.all([
      sendEmail({
        from: FROM,
        to: toClient,
        reply_to: 'richie@netlab.mx',
        subject: sandboxTag + 'Su propuesta de experiencia · El Romeral',
        html: clientHtml
      }),
      sendEmail({
        from: FROM,
        to: toInternal,
        subject: `${sandboxTag}Nuevo lead - ${b.tipoEvento || 'Evento'} - ${b.personas != null ? b.personas : ''} invitados`,
        html: internalHtml
      })
    ])

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
