import { Ambulance, Bell, Database, Radio } from 'lucide-react'

export function MetricsGrid({
  patients,
  redPatients,
  avgLatency,
  queueSize,
}) {
  return (
    <section className="metrics-grid">
      <article className="metric-card">
        <Ambulance size={24} />
        <div>
          <span>Ambulancias activas</span>
          <strong>{patients.length}</strong>
        </div>
      </article>

      <article className="metric-card red">
        <Bell size={24} />
        <div>
          <span>Triage rojo</span>
          <strong>{redPatients.length}</strong>
        </div>
      </article>

      <article className="metric-card">
        <Radio size={24} />
        <div>
          <span>Latencia promedio</span>
          <strong>{avgLatency} ms</strong>
        </div>
      </article>

      <article className="metric-card">
        <Database size={24} />
        <div>
          <span>Cola HIS</span>
          <strong>{queueSize}</strong>
        </div>
      </article>
    </section>
  )
}