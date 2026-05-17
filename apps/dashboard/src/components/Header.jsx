import { Activity, Wifi } from 'lucide-react'

export function Header({ soundEnabled, enableSound }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={22} />
        </div>
        <div>
          <h1>VitalSync</h1>
          <p>Dashboard de Emergencias — Hospital San Vicente</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-live">
          <Wifi size={16} />
          WebSocket LIVE
        </div>

        <button className="sound-button" onClick={enableSound}>
          {soundEnabled ? 'Sonido activo' : 'Activar sonido'}
        </button>
      </div>
    </header>
  )
}