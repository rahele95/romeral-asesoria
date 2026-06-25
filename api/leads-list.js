const { Client } = require('@notionhq/client')

// Lee los leads capturados por la Asesoría Virtual desde Notion.
// Usa el mismo env var que el submit (api/leads.js); fallback al ID conocido.
const DB_ID = process.env.NOTION_LEADS_DB_ID || '0fd5e2844f2f470087d289fad23006e4'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!process.env.NOTION_API_KEY) {
    return res.status(500).json({ error: 'Notion no configurado (falta NOTION_API_KEY)' })
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY })

  try {
    const r = await notion.databases.query({
      database_id: DB_ID,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 100,
    })

    const leads = r.results.map(p => {
      const props = p.properties || {}
      return {
        id: p.id,
        nombre:           props['Nombre']?.title?.[0]?.text?.content || '',
        telefono:         props['Teléfono']?.phone_number || '',
        email:            props['Email']?.email || '',
        nombresFestejado: props['Nombres Novios/Festejado']?.rich_text?.[0]?.text?.content || '',
        fechaEvento:      props['Fecha Evento']?.rich_text?.[0]?.text?.content || '',
        personas:         props['Personas']?.number || 0,
        hora:             props['Hora']?.select?.name || '',
        musica:           props['Música']?.select?.name || '',
        total:            props['Total Estimado']?.number || 0,
        estado:           props['Estado']?.select?.name || 'Nuevo',
        fechaCaptura:     p.created_time,
      }
    })

    res.status(200).json(leads)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
