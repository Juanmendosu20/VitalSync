import { Bell } from 'lucide-react'

export function CriticalAlert({ redPatients }) {
  if (redPatients.length === 0) return null

  const patient = redPatients[0]

  return (
    <section className="critical-alert">
      <Bell size={24} />
      <div>
        <h2>⚠ Triage ROJO detectado — {patient.ambulance}</h2>
        <p>
          Paciente {patient.patientHash} · PA {patient.pa} · FC {patient.fc} bpm
        </p>
      </div>
    </section>
  )
}