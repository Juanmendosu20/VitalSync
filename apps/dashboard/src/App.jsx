import { Activity, Ambulance, Bell, Database, Radio, Shield, Wifi } from 'lucide-react'
import './App.css'
import { useMockRealtime } from './hooks/useMockRealtime'
import { useAlertSound } from './hooks/useAlertSound'

function getTriageClass(triage) {
  if (triage === 'ROJO') return 'triage-red'
  if (triage === 'AMARILLO') return 'triage-yellow'
  return 'triage-green'
}

export default function App() {
  const { patients, eventsReceived } = useMockRealtime()

  const redPatients = patients.filter((p) => p.triage === 'ROJO')
  const { soundEnabled, enableSound } = useAlertSound(redPatients)

  const avgLatency = Math.round(
    patients.reduce((sum, p) => sum + p.latency, 0) / patients.length
  )

  return (
    <main className="dashboard">
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
            <strong>2</strong>
          </div>
        </article>
      </section>

      {redPatients.length > 0 && (
        <section className="critical-alert">
          <Bell size={24} />
          <div>
            <h2>⚠ Triage ROJO detectado — {redPatients[0].ambulance}</h2>
            <p>
              Paciente {redPatients[0].patientHash} · PA {redPatients[0].pa} · FC{' '}
              {redPatients[0].fc} bpm
            </p>
          </div>
        </section>
      )}

      <section className="content-grid">
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
                  <span>
                    FC <strong>{patient.fc}</strong> bpm
                  </span>
                  <span>
                    PA <strong>{patient.pa}</strong>
                  </span>
                  <span>
                    SpO₂ <strong>{patient.spo2}%</strong>
                  </span>
                </div>

                <div className="latency-pill">{patient.latency} ms</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="side-panel">
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

          <article className="panel-card security">
            <Shield size={22} />
            <p>
              La UI muestra <strong>patient_hash</strong>, nunca nombre, cédula ni
              información personal.
            </p>
          </article>
        </aside>
      </section>
    </main>
  )
}