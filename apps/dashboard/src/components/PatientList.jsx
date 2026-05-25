import { useEffect, useState } from 'react'

function getTriageClass(triage) {
  if (triage === 'ROJO') return 'triage-red'
  if (triage === 'AMARILLO') return 'triage-yellow'
  return 'triage-green'
}

function formatAge(ms) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

// Cada tarjeta tiene su propio contador desde su receivedAt
function PatientCard({ patient }) {
  const [age, setAge] = useState(0)

  useEffect(() => {
    // Resetea el contador cada vez que llega un nuevo dato (receivedAt cambia)
    setAge(0)
    const t = setInterval(() => {
      setAge(Date.now() - patient.receivedAt)
    }, 1000)
    return () => clearInterval(t)
  }, [patient.receivedAt]) // <-- solo se reinicia cuando cambia el dato real

  return (
    <article className={`patient-card ${getTriageClass(patient.triage)}`}>
      <div className="patient-main">
        <span className={`triage-badge ${getTriageClass(patient.triage)}`}>
          {patient.triage}
        </span>
        <div>
          <h3>{patient.ambulance}</h3>
          <p>{patient.patientHash}</p>
        </div>
      </div>

      <div className="vitals">
        <span>FC <strong>{patient.fc}</strong> bpm</span>
        <span>PA <strong>{patient.pa}</strong></span>
        <span>SpO₂ <strong>{patient.spo2}%</strong></span>
      </div>

      <div className="latency-pill">{formatAge(age)}</div>
    </article>
  )
}

export function PatientList({ patients }) {
  return (
    <section>
      <h2 className="section-title">Pacientes en ruta</h2>
      <div className="patient-list">
        {patients.map((patient) => (
          <PatientCard key={patient.patientHash} patient={patient} />
        ))}
      </div>
    </section>
  )
}
