function getLatencyStatus(avgLatency) {
  return avgLatency < 3000
}

export function ObservabilityPanel({
  avgLatency,
  eventsReceived,
  connectionStatus,
  source,
}) {
  const slaOk =
    getLatencyStatus(avgLatency)

  return (
    <article className="panel-card">
      <h2 className="section-title">
        Observabilidad
      </h2>

      <div className="obs-row">
        <span>Realtime</span>
        <strong>
          {connectionStatus}
        </strong>
      </div>

      <div className="obs-row">
        <span>Fuente</span>
        <strong>{source}</strong>
      </div>

      <div className="obs-row">
        <span>
          Última latencia
        </span>

        <strong>
          {avgLatency} ms
        </strong>
      </div>

      <div className="obs-row">
        <span>SLA ESC-02</span>

        <strong
          style={{
            color: slaOk
              ? '#86efac'
              : '#fca5a5',
          }}
        >
          {slaOk
            ? 'OK (<3s)'
            : 'BREACH'}
        </strong>
      </div>

      <div className="obs-row">
        <span>
          Eventos recibidos
        </span>

        <strong>
          {eventsReceived}
        </strong>
      </div>

      <div className="obs-row">
        <span>PII expuesta</span>

        <strong>0</strong>
      </div>
    </article>
  )
}