let HIS_IS_DOWN = false
let AUTO_RECOVER_AT = null
let FAILURE_COUNT = 0
let LAST_FAILURE_AT = null

const FAILURE_DURATION_MS = 15000

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query?.action

  if (HIS_IS_DOWN && AUTO_RECOVER_AT && Date.now() >= AUTO_RECOVER_AT) {
    HIS_IS_DOWN = false
    AUTO_RECOVER_AT = null
  }

  if (req.method === 'POST' && action === 'fail') {
    HIS_IS_DOWN = true
    AUTO_RECOVER_AT = Date.now() + FAILURE_DURATION_MS
    LAST_FAILURE_AT = new Date().toISOString()

    return res.status(200).json({
      ok: true,
      his_status: 'DOWN',
      message: 'HIS simulado como caído temporalmente',
      auto_recover_in_ms: FAILURE_DURATION_MS,
    })
  }

  if (req.method === 'GET') {
    if (HIS_IS_DOWN) {
      return res.status(503).json({
        ok: false,
        his_status: 'DOWN',
        failure_count: FAILURE_COUNT,
        last_failure_at: LAST_FAILURE_AT,
        auto_recover_at: AUTO_RECOVER_AT,
      })
    }

    return res.status(200).json({
      ok: true,
      his_status: 'UP',
      message: 'HIS operativo',
    })
  }

  if (req.method === 'POST') {
    if (HIS_IS_DOWN) {
      FAILURE_COUNT++
      LAST_FAILURE_AT = new Date().toISOString()

      return res.status(503).json({
        ok: false,
        error: 'HIS_UNAVAILABLE',
        message: 'HIS temporalmente no disponible',
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