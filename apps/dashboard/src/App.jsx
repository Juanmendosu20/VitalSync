import './App.css'
import { useRealtimeSource } from './hooks/useRealtimeSource'
import { useAlertSound } from './hooks/useAlertSound'
import { useCircuitBreakerSource } from './hooks/useCircuitBreakerSource'

import { Header } from './components/Header'
import { MetricsGrid } from './components/MetricsGrid'
import { CriticalAlert } from './components/CriticalAlert'
import { PatientList } from './components/PatientList'
import { CircuitBreakerPanel } from './components/CircuitBreakerPanel'
import { ObservabilityPanel } from './components/ObservabilityPanel'
import { SecurityPanel } from './components/SecurityPanel'
import HisControlPanel from './components/HisControlPanel'

export default function App() {
  const {
    patients,
    eventsReceived,
    connectionStatus,
    source,
    avgLatency,
  } = useRealtimeSource()
  const { circuitState, circuitSource } = useCircuitBreakerSource()

  const redPatients = patients.filter((p) => p.triage === 'ROJO')

  const { soundEnabled, enableSound } =
    useAlertSound(redPatients)

  return (
    <main className="dashboard">
      <Header
        soundEnabled={soundEnabled}
        enableSound={enableSound}
      />

      <MetricsGrid
        patients={patients}
        redPatients={redPatients}
        avgLatency={avgLatency ?? 0}
        queueSize={circuitState?.queueSize ?? 0}
      />

      <CriticalAlert redPatients={redPatients} />

      <section className="content-grid">
        <PatientList patients={patients} />

        <aside className="side-panel">
          <CircuitBreakerPanel
            circuitState={circuitState}
            circuitSource={circuitSource}
          />

          <HisControlPanel />

          <ObservabilityPanel
            avgLatency={avgLatency ?? 0}
            eventsReceived={eventsReceived}
            connectionStatus={connectionStatus}
            source={source}
          />

          <SecurityPanel />
        </aside>
      </section>
    </main>
  )
}
