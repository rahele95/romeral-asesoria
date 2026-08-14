// Actualiza un lead en Supabase (estado, asesor, notas, fechas) desde el panel CRM.
// Las escrituras pasan por aquí con la SECRET key (server-side); el frontend nunca escribe.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).end()

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado (faltan SUPABASE_URL / SUPABASE_SECRET_KEY)' })
  }

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const id = b.id
    if (!id) return res.status(400).json({ error: 'Falta el id del lead' })

    // Solo se actualizan campos permitidos y presentes en el body
    const allowed = ['estado', 'asignado_a', 'notas', 'contacted_at', 'seguimiento_at']
    const patch = {}
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(b, k)) patch[k] = b[k]
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nada que actualizar' })

    const r = await fetch(SB_URL + '/rest/v1/leads?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(patch)
    })
    if (!r.ok) { throw new Error('Supabase ' + r.status + ': ' + (await r.text())) }
    const rows = await r.json()
    const lead = rows[0] || null

    // Espejo al pipeline del ERP: el estado del lead mueve la etapa de su oportunidad.
    // (No degrada: solo avanza etapas tempranas; ganado/perdido manuales del kanban se respetan.)
    const ETAPA = { 'Contactado': 'contactado', 'Cita agendada': 'cita', 'Ganado': 'ganado', 'Perdido': 'perdido' }
    const etapa = patch.estado && ETAPA[patch.estado]
    if (etapa && lead && (lead.whatsapp || lead.email)) {
      try {
        const filtros = []
        if (lead.whatsapp) filtros.push('whatsapp.eq.' + encodeURIComponent(lead.whatsapp))
        if (lead.email) filtros.push('email.eq.' + encodeURIComponent(lead.email))
        const H = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }
        const rc = await fetch(SB_URL + '/rest/v1/contactos?select=id&or=(' + filtros.join(',') + ')&limit=1', { headers: H })
        const contactos = rc.ok ? await rc.json() : []
        if (contactos[0]) {
          await fetch(
            SB_URL + '/rest/v1/oportunidades?contacto_id=eq.' + contactos[0].id + '&etapa=in.(nuevo,contactado,cita)',
            { method: 'PATCH', headers: H, body: JSON.stringify({ etapa }) }
          )
        }
      } catch (e) { console.error('espejo pipeline:', e && e.message) }
    }

    res.status(200).json({ ok: true, lead })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
