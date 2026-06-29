// Lee los leads capturados por la Asesoría Virtual desde Supabase (tabla public.leads).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const SB_URL = process.env.SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SECRET_KEY
  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado (faltan SUPABASE_URL / SUPABASE_SECRET_KEY)' })
  }

  try {
    const r = await fetch(SB_URL + '/rest/v1/leads?select=*&order=created_at.desc&limit=200', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    })
    if (!r.ok) { throw new Error('Supabase ' + r.status + ': ' + (await r.text())) }
    const rows = await r.json()

    const leads = rows.map(p => ({
      id:               p.id,
      nombre:           p.nombre || '',
      telefono:         p.whatsapp || '',
      tel:              p.whatsapp || '',
      email:            p.email || '',
      nombresFestejado: p.nombre || '',
      fechaEvento:      p.fecha_evento || '',
      tipoEvento:       p.tipo_evento || '',
      personas:         p.personas || 0,
      hora:             '',
      musica:           '',
      total:            p.total || 0,
      quiereCita:       !!p.quiere_cita,
      quiereEmail:      !!p.quiere_email,
      estado:           'Nuevo',
      fechaCaptura:     p.created_at
    }))

    res.status(200).json(leads)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
