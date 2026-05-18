import { Shield } from 'lucide-react'

export function SecurityPanel() {
  return (
    <article className="panel-card security">
      <Shield size={22} />
      <p>
        La UI muestra <strong>patient_hash</strong>, nunca nombre, cédula ni
        información personal.
      </p>
    </article>
  )
}