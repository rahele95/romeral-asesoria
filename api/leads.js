// Guarda un lead en Supabase (tabla public.leads).
// La SECRET key vive en process.env.SUPABASE_SECRET_KEY (Vercel), nunca en el repo.
const crypto = require('crypto')

// --- Meta Conversions API (server-side Lead, deduplicado con el Pixel vía event_id) ---
function sha256(v) { return crypto.createHash('sha256').update(v).digest('hex') }
// email: lowercase + trim antes de hashear (norma de Meta)
function hashEmail(email) {
  if (!email) return null
  const e = String(email).trim().toLowerCase()
  return e ? sha256(e) : null
}
// teléfono: solo dígitos; si son 10 (celular MX) se antepone lada 52
function hashPhone(phone) {
  if (!phone) return null
  let dg = String(phone).replace(/\D/g, '')
  if (!dg) return null
  if (dg.length === 10) dg = '52' + dg
  return sha256(dg)
}

// Envía el Lead a Meta CAPI. Nunca lanza: si falla, se loguea y la respuesta del lead sigue intacta.
async function sendMetaCapi(b, row, req) {
  const token = process.env.META_CAPI_ACCESS_TOKEN
  const pixelId = process.env.META_PIXEL_ID
  if (!token || !pixelId) return // sin token/pixel configurado: se salta silenciosamente
  try {
    const userData = {}
    const em = hashEmail(row.email)
    const ph = hashPhone(row.whatsapp)
    if (em) userData.em = [em]
    if (ph) userData.ph = [ph]
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() ||
               (req.socket && req.socket.remoteAddress) || null
    if (ip) userData.client_ip_address = ip
    if (req.headers['user-agent']) userData.client_user_agent = req.headers['user-agent']
    if (b.fbc) userData.fbc = b.fbc
    if (b.fbp) userData.fbp = b.fbp

    const event = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: req.headers.referer || 'https://asesoria.elromeral.com.mx/precio.html',
      user_data: userData,
      custom_data: { value: row.total || 0, currency: 'MXN' }
    }
    if (b.event_id) event.event_id = b.event_id // MISMO id que fbq('track','Lead') en el browser

    const body = { data: [event] }
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE

    const r = await fetch(
      'https://graph.facebook.com/v21.0/' + pixelId + '/events?access_token=' + encodeURIComponent(token),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!r.ok) console.error('Meta CAPI ' + r.status + ': ' + (await r.text()))
  } catch (e) {
    console.error('Meta CAPI error:', e && e.message)
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado (faltan SUPABASE_URL / SUPABASE_SECRET_KEY)' })
  }

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})

    const row = {
      session_id:   b.session_id || b.sessionId || 'sin-sesion',
      nombre:       b.nombre || null,
      whatsapp:     b.whatsapp || b.telefono || null,
      email:        b.email || null,
      tipo_evento:  b.tipoEvento || b.tipo_evento || null,
      fecha_evento: b.fecha || b.fecha_evento || null,
      personas:     (b.personas != null && b.personas !== '') ? parseInt(b.personas, 10) : null,
      total:        (b.total != null && b.total !== '') ? Number(b.total) : null,
      quiere_cita:  !!b.quiere_cita,
      quiere_email: !!b.quiere_email,
      // Atribución de campañas (nullable; ver supabase/migration-utm.sql)
      utm_source:   b.utm_source || null,
      utm_medium:   b.utm_medium || null,
      utm_campaign: b.utm_campaign || null,
      utm_content:  b.utm_content || null,
      utm_term:     b.utm_term || null,
      fbclid:       b.fbclid || null
    }

    const r = await fetch(SB_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    })
    if (!r.ok) { throw new Error('Supabase ' + r.status + ': ' + (await r.text())) }

    // Lead guardado con éxito → espejo server-side a Meta CAPI (best-effort, nunca rompe la respuesta)
    await sendMetaCapi(b, row, req)

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
