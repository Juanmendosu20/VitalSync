function getTriageClass(triage) {
  if (triage === 'ROJO') return 'triage-red'
  if (triage === 'AMARILLO') return 'triage-yellow'
  return 'triage-green'
}

export function PatientList({ patients }) {
  return (
    <section>
      <h2 className="section-title">Pacientes en ruta</h2>
      <div className="patient-list">
        {patients.map((patient) => (
          <article
            key={patient.patientHash}
            className={`patient-card ${getTriageClass(patient.triage)}`}
          >
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

            <div className="latency-pill">
              {patient.latency != null ? `${patient.latency} ms` : '-- ms'}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
