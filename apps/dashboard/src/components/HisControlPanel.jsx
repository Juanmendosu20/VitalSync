import { useState } from 'react'

export default function HisControlPanel() {
  const [hisStatus, setHisStatus] = useState('UP')
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState(null)

  const simulateOverload = () => {
    setLoading(true)
    setHisStatus('DOWN')

    window.dispatchEvent(new Event('simulate-his-overload'))

    setLastAction({
      action: 'sobrecarga simulada',
      time: new Date().toLocaleTimeString(),
    })

    setTimeout(() => {
      setHisStatus('UP')
      setLoading(false)
    }, 9000)
  }

  const statusColor =
    hisStatus === 'UP'
      ? '#22c55e'
      : hisStatus === 'DOWN'
        ? '#ef4444'
        : '#f59e0b'

  return (
    <div
      style={{
        background: '#1a1a2e',
        border: `1px solid ${statusColor}`,
        borderRadius: '8px',
        padding: '16px',
        marginTop: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            color: '#9ca3af',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}
        >
          🎮 CONTROL DEMO — HIS MOCK
        </span>

        <span
          style={{
            color: statusColor,
            fontSize: '12px',
            fontWeight: 700,
            background: `${statusColor}22`,
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          ● {hisStatus}
        </span>
      </div>

      <button
        onClick={simulateOverload}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: loading ? '#374151' : '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: '12px',
          opacity: loading ? 0.6 : 1,
        }}
      >
        ⚡ Simular sobrecarga HIS
      </button>

      {lastAction && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
          Última acción:{' '}
          <span style={{ color: '#d1d5db' }}>{lastAction.action}</span> a las{' '}
          {lastAction.time}
        </div>
      )}
    </div>
  )
}