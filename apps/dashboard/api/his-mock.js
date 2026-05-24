/**
 * HIS Mock — simula el Sistema de Información Hospitalaria legacy
 * GET  /api/his-mock         → retorna estado actual (up/down)
 * POST /api/his-mock         → recibe resumen clínico (falla si HIS está caído)
 * POST /api/his-mock?action=fail    → pone el HIS en modo caído
 * POST /api/his-mock?action=restore → restaura el HIS
 */

let HIS_IS_DOWN = false
let FAILURE_COUNT = 0
let LAST_FAILURE_AT = null

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  if (req.method === 'POST' && action === 'fail') {
    HIS_IS_DOWN = true
    LAST_FAILURE_AT = new Date().toISOString()
    return res.status(200).json({ ok: true, his_status: 'DOWN', message: 'HIS simulado como caído' })
  }

  if (req.method === 'POST' && action === 'restore') {
    HIS_IS_DOWN = false
    FAILURE_COUNT = 0
    return res.status(200).json({ ok: true, his_status: 'UP', message: 'HIS restaurado' })
  }

  if (req.method === 'GET') {
    if (HIS_IS_DOWN) {
      return res.status(503).json({
        ok: false,
        his_status: 'DOWN',
        failure_count: FAILURE_COUNT,
        last_failure_at: LAST_FAILURE_AT,
      })
    }
    return res.status(200).json({ ok: true, his_status: 'UP', message: 'HIS operativo' })
  }

  if (req.method === 'POST') {
    if (HIS_IS_DOWN) {
      FAILURE_COUNT++
      LAST_FAILURE_AT = new Date().toISOString()
      return res.status(503).json({
        ok: false,
        error: 'HIS_UNAVAILABLE',
        message: 'Servidor HIS no disponible. Reintente más tarde.',
        failure_count: FAILURE_COUNT,
      })
    }
    const latency = Math.floor(Math.random() * 600) + 200
    setTimeout(() => {
      res.status(200).json({
        ok: true,
        his_status: 'UP',
        received_at: new Date().toISOString(),
        latency_ms: latency,
        record_id: `HIS-${Date.now()}`,
      })
    }, latency)
  }
}
