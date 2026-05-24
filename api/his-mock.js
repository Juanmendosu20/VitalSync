/**
 * HIS Mock — simula el Sistema de Información Hospitalaria legacy
 * GET  /api/his-mock         → retorna estado actual (up/down)
 * POST /api/his-mock         → recibe resumen clínico (falla si HIS está caído)
 * POST /api/his-mock?action=fail    → pone el HIS en modo caído
 * POST /api/his-mock?action=restore → restaura el HIS
 *
 * El estado se guarda en una variable de proceso (Vercel serverless).
 * Para la demo: usar los botones del dashboard que llaman ?action=fail / restore
 */

// Variable de módulo — persiste dentro del mismo worker de Vercel
let HIS_IS_DOWN = false
let FAILURE_COUNT = 0
let LAST_FAILURE_AT = null

export default function handler(req, res) {
  // CORS para el dashboard
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  // Toggle de estado para la demo
  if (req.method === 'POST' && action === 'fail') {
    HIS_IS_DOWN = true
    LAST_FAILURE_AT = new Date().toISOString()
    console.log('[HIS-MOCK] ⚠️  HIS puesto en modo CAÍDO para demo')
    return res.status(200).json({ ok: true, his_status: 'DOWN', message: 'HIS simulado como caído' })
  }

  if (req.method === 'POST' && action === 'restore') {
    HIS_IS_DOWN = false
    FAILURE_COUNT = 0
    console.log('[HIS-MOCK] ✅ HIS restaurado')
    return res.status(200).json({ ok: true, his_status: 'UP', message: 'HIS restaurado' })
  }

  // GET — health check del HIS
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

  // POST — recibir resumen clínico
  if (req.method === 'POST') {
    if (HIS_IS_DOWN) {
      FAILURE_COUNT++
      LAST_FAILURE_AT = new Date().toISOString()
      console.log(`[HIS-MOCK] ❌ Rechazo #${FAILURE_COUNT} — HIS caído`)
      return res.status(503).json({
        ok: false,
        error: 'HIS_UNAVAILABLE',
        message: 'Servidor HIS no disponible. Reintente más tarde.',
        failure_count: FAILURE_COUNT,
      })
    }

    // Simular latencia del HIS legacy (200-800ms)
    const latency = Math.floor(Math.random() * 600) + 200
    setTimeout(() => {
      console.log(`[HIS-MOCK] ✅ Resumen clínico recibido en ${latency}ms`, req.body)
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
