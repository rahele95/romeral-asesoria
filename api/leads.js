// Guarda un lead en Supabase (tabla public.leads).
// La SECRET key vive en process.env.SUPABASE_SECRET_KEY (Vercel), nunca en el repo.
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
      quiere_email: !!b.quiere_email
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

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
