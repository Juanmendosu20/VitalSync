export function CircuitBreakerPanel() {
  return (
    <article className="panel-card">
      <h2 className="section-title">Circuit Breaker — HIS</h2>

      <div className="circuit-state closed">
        <span></span>
        CLOSED
      </div>

      <p>
        HIS operativo. Los resúmenes clínicos se envían con límite máximo de
        2 req/seg para no tumbar el sistema legado.
      </p>
    </article>
  )
}