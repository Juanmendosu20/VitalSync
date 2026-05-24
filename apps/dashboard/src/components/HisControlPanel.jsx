/**
 * HisControlPanel — Panel de control del HIS para la demo
 * Permite al presentador:
 *  - Ver el estado actual del HIS (UP / DOWN)
 *  - Simular caída del HIS (→ Circuit Breaker se abre)
 *  - Restaurar el HIS (→ Circuit Breaker pasa a HALF_OPEN → CLOSED)
 */
import { useState, useEffect } from 'react'

const HIS_BASE = import.meta.env.VITE_HIS_MOCK_URL ?? '/api/his-mock'

export default function HisControlPanel() {
  const [hisStatus, setHisStatus] = useState('CHECKING')
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState(null)

  // Polling del estado del HIS cada 5 segundos
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(HIS_BASE)
        const d = await r.json()
        setHisStatus(d.his_status ?? 'UNKNOWN')
      } catch {
        setHisStatus('UNKNOWN')
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  const toggle = async (action) => {
    setLoading(true)
    try {
      const r = await fetch(`${HIS_BASE}?action=${action}`, { method: 'POST' })
      const d = await r.json()
      setHisStatus(d.his_status)
      setLastAction({ action, time: new Date().toLocaleTimeString() })
    } catch (e) {
      console.error('Error toggling HIS:', e)
    } finally {
      setLoading(false)
    }
  }

  const isDown = hisStatus === 'DOWN'
  const statusColor = hisStatus === 'UP' ? '#22c55e' : hisStatus === 'DOWN' ? '#ef4444' : '#f59e0b'

  return (
    <div style={{
      background: '#1a1a2e',
      border: `1px solid ${statusColor}`,
      borderRadius: '8px',
      padding: '16px',
      marginTop: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>
          🎮 CONTROL DEMO — HIS MOCK
        </span>
        <span style={{
          color: statusColor,
          fontSize: '12px',
          fontWeight: 700,
          background: `${statusColor}22`,
          padding: '2px 8px',
          borderRadius: '4px',
        }}>
          ● {hisStatus}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => toggle('fail')}
          disabled={loading || isDown}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: isDown ? '#374151' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isDown || loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            opacity: isDown ? 0.5 : 1,
          }}
        >
          ⚡ Simular caída HIS
        </button>

        <button
          onClick={() => toggle('restore')}
          disabled={loading || !isDown}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: !isDown ? '#374151' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !isDown || loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            opacity: !isDown ? 0.5 : 1,
          }}
        >
          ✅ Restaurar HIS
        </button>
      </div>

      {lastAction && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
          Última acción: <span style={{ color: '#d1d5db' }}>{lastAction.action}</span> a las {lastAction.time}
        </div>
      )}
    </div>
  )
}
