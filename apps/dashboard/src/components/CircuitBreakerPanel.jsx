function getCircuitClass(state) {
  if (state === 'OPEN') return 'open'
  if (state === 'HALF_OPEN') return 'half-open'
  return 'closed'
}

function getCircuitDescription(state) {
  if (state === 'OPEN') {
    return 'HIS no disponible. El circuito está abierto y los resúmenes clínicos se acumulan en la cola sin tumbar el sistema.'
  }

  if (state === 'HALF_OPEN') {
    return 'HIS en recuperación. Se permite una prueba controlada antes de cerrar completamente el circuito.'
  }

  return 'HIS operativo. Los resúmenes clínicos se envían con límite máximo de 2 req/seg para no tumbar el sistema legado.'
}

export function CircuitBreakerPanel({ circuitState, circuitSource }) {
  const state = circuitState?.state ?? 'UNKNOWN'

  return (
    <article className="panel-card">
      <h2 className="section-title">Circuit Breaker — HIS</h2>

      <div className={`circuit-state ${getCircuitClass(state)}`}>
        <span></span>
        {state}
      </div>

      <p>{getCircuitDescription(state)}</p>

      <div className="obs-row">
        <span>Cola HIS</span>
        <strong>{circuitState?.queueSize ?? 0}</strong>
      </div>

      <div className="obs-row">
        <span>Fuente</span>
        <strong>{circuitSource}</strong>
      </div>

      {circuitState?.lastFailure && (
        <div className="obs-row">
          <span>Último fallo</span>
          <strong>{circuitState.lastFailure}</strong>
        </div>
      )}
    </article>
  )
}