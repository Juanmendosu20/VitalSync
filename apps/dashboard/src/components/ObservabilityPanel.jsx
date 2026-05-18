export function ObservabilityPanel({ avgLatency, eventsReceived }) {
  return (
    <article className="panel-card">
      <h2 className="section-title">Observabilidad</h2>

      <div className="obs-row">
        <span>WebSocket</span>
        <strong>LIVE</strong>
      </div>

      <div className="obs-row">
        <span>Última latencia</span>
        <strong>{avgLatency} ms</strong>
      </div>

      <div className="obs-row">
        <span>Eventos recibidos</span>
        <strong>{eventsReceived}</strong>
      </div>

      <div className="obs-row">
        <span>PII expuesta</span>
        <strong>0</strong>
      </div>
    </article>
  )
}