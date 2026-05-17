import './App.css'
import { useMockRealtime } from './hooks/useMockRealtime'
import { useAlertSound } from './hooks/useAlertSound'

import { Header } from './components/Header'
import { MetricsGrid } from './components/MetricsGrid'
import { CriticalAlert } from './components/CriticalAlert'
import { PatientList } from './components/PatientList'
import { CircuitBreakerPanel } from './components/CircuitBreakerPanel'
import { ObservabilityPanel } from './components/ObservabilityPanel'
import { SecurityPanel } from './components/SecurityPanel'

export default function App() {
  const { patients, eventsReceived } = useMockRealtime()

  const redPatients = patients.filter((p) => p.triage === 'ROJO')

  const { soundEnabled, enableSound } =
    useAlertSound(redPatients)

  const avgLatency = Math.round(
    patients.reduce((sum, p) => sum + p.latency, 0) /
      patients.length
  )

  return (
    <main className="dashboard">
      <Header
        soundEnabled={soundEnabled}
        enableSound={enableSound}
      />

      <MetricsGrid
        patients={patients}
        redPatients={redPatients}
        avgLatency={avgLatency}
      />

      <CriticalAlert redPatients={redPatients} />

      <section className="content-grid">
        <PatientList patients={patients} />

        <aside className="side-panel">
          <CircuitBreakerPanel />

          <ObservabilityPanel
            avgLatency={avgLatency}
            eventsReceived={eventsReceived}
          />

          <SecurityPanel />
        </aside>
      </section>
    </main>
  )
}