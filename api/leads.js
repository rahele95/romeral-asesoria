const { Client } = require('@notionhq/client')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.NOTION_API_KEY || !process.env.NOTION_LEADS_DB_ID) {
    return res.status(500).json({ error: 'Notion no configurado (faltan NOTION_API_KEY / NOTION_LEADS_DB_ID)' })
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY })
  const DB_ID = process.env.NOTION_LEADS_DB_ID

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        'Nombre':                   { title: [{ text: { content: b.nombre || '' } }] },
        'Teléfono':                 { phone_number: b.telefono || null },
        'Email':                    { email: b.email || null },
        'Tipo Evento':              { select: { name: b.tipoEvento || 'social' } },
        'Nombres Novios/Festejado': { rich_text: [{ text: { content: b.nombre || '' } }] },
        'Fecha Evento':             { rich_text: [{ text: { content: b.fecha || '' } }] },
        'Personas':                 { number: parseInt(b.personas) || 0 },
        'Hora':                     { select: { name: b.hora || 'noche' } },
        'Música':                   { select: { name: b.musica || 'sin' } },
        'Total Estimado':           { number: parseInt(b.total) || 0 },
        'Fuente':                   { select: { name: 'Asesoría Virtual' } },
        'Estado':                   { select: { name: 'Nuevo' } },
        // 'Fecha Captura' es created_time: la asigna Notion automáticamente.
      }
    })
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
