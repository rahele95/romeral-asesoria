// Tracking del funnel: guarda un evento en public.funnel_events.
// En el paso 'inicio' además registra la sesión (user_agent + referrer) en public.sessions.
// Steps: inicio, fecha_seleccionada, tipo_seleccionado, invitados_definidos,
//        brochure_iniciado, brochure_completado, precio_visto, lead_capturado, cita_agendada
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado (faltan SUPABASE_URL / SUPABASE_SECRET_KEY)' })
  }

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const session_id = b.session_id || b.sessionId
    const step = b.step
    if (!session_id || !step) return res.status(400).json({ error: 'Faltan session_id o step' })
    const data = (b.data && typeof b.data === 'object') ? b.data : {}

    const headers = {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }

    const tasks = [
      fetch(SB_URL + '/rest/v1/funnel_events', {
        method: 'POST', headers, body: JSON.stringify({ session_id, step, data })
      })
    ]

    // En el primer evento de la sesión, registra la fila de sesión.
    if (step === 'inicio') {
      const user_agent = data.user_agent || req.headers['user-agent'] || null
      const referrer = data.referrer || req.headers['referer'] || req.headers['referrer'] || null
      tasks.push(fetch(SB_URL + '/rest/v1/sessions', {
        method: 'POST', headers, body: JSON.stringify({ session_id, user_agent, referrer })
      }))
    }

    const results = await Promise.all(tasks)
    const bad = results.find(r => !r.ok)
    if (bad) { throw new Error('Supabase ' + bad.status + ': ' + (await bad.text())) }

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
