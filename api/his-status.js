/**
 * Proxy ligero: el dashboard consulta el estado del HIS mock
 * GET /api/his-status → retorna { his_status: 'UP' | 'DOWN' }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  try {
    const r = await fetch(`${base}/api/his-mock`)
    const data = await r.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(503).json({ ok: false, his_status: 'UNKNOWN', error: e.message })
  }
}
