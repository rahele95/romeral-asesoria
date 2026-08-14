// Marca la cita AUTOMÁTICAMENTE cuando la persona elige canal de agenda
// (presencial / videollamada / WhatsApp) en el paso final de la asesoría.
// Actualiza: (1) el/los leads de la sesión → estado 'cita' + canal en notas,
// (2) la oportunidad del pipeline del ERP → etapa 'cita' (si estaba en 'nuevo').
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase no configurado' })

  const H = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  }

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const sid = String(b.session_id || '').trim()
    const canal = String(b.canal || '').trim().slice(0, 60)
    if (!sid) return res.status(400).json({ error: 'falta session_id' })

    // 1) Lead(s) de la sesión → cita agendada (y regresa los datos para el cruce)
    const r1 = await fetch(
      SB_URL + '/rest/v1/leads?session_id=eq.' + encodeURIComponent(sid),
      {
        method: 'PATCH',
        headers: Object.assign({ 'Prefer': 'return=representation' }, H),
        body: JSON.stringify({
          estado: 'Cita agendada',
          quiere_cita: true,
          notas: canal ? ('Cita agendada · canal: ' + canal) : 'Cita agendada'
        })
      }
    )
    const leads = r1.ok ? await r1.json() : []

    // 2) Pipeline del ERP: la oportunidad del contacto (match por whatsapp o email) pasa a 'cita'
    let opsActualizadas = 0
    const lead = leads.find(l => l.whatsapp || l.email)
    if (lead) {
      const filtros = []
      if (lead.whatsapp) filtros.push('whatsapp.eq.' + encodeURIComponent(lead.whatsapp))
      if (lead.email) filtros.push('email.eq.' + encodeURIComponent(lead.email))
      const rc = await fetch(
        SB_URL + '/rest/v1/contactos?select=id&or=(' + filtros.join(',') + ')&limit=1',
        { headers: H }
      )
      const contactos = rc.ok ? await rc.json() : []
      if (contactos[0]) {
        const ro = await fetch(
          SB_URL + '/rest/v1/oportunidades?contacto_id=eq.' + contactos[0].id + '&etapa=eq.nuevo',
          {
            method: 'PATCH',
            headers: Object.assign({ 'Prefer': 'return=representation' }, H),
            body: JSON.stringify({ etapa: 'cita' })
          }
        )
        if (ro.ok) opsActualizadas = (await ro.json()).length
      }
    }

    res.status(200).json({ ok: true, leads: leads.length, oportunidades: opsActualizadas })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
