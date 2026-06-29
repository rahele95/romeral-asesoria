// Devuelve los datos del CRM (sessions, funnel_events, leads) leídos de Supabase
// con la SECRET key (server-side). Evita exponer llaves en el frontend y sortea RLS.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado (faltan SUPABASE_URL / SUPABASE_SECRET_KEY)' })
  }

  const headers = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  const get = async (path) => {
    const r = await fetch(SB_URL + '/rest/v1/' + path, { headers })
    if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()))
    return r.json()
  }

  try {
    const [sessions, funnel_events, leads] = await Promise.all([
      get('sessions?select=session_id,user_agent,referrer,created_at&order=created_at.desc&limit=10000'),
      get('funnel_events?select=session_id,step,created_at&order=created_at.asc&limit=40000'),
      get('leads?select=*&order=created_at.desc&limit=4000')
    ])
    res.status(200).json({ sessions, funnel_events, leads })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
