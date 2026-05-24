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
  } = useRealtimeSource()
  const { circuitState, circuitSource } = useCircuitBreakerSource()

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

          {/* Panel de control demo — simular caída/recuperación del HIS */}
          <HisControlPanel />

          <ObservabilityPanel
            avgLatency={avgLatency}
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
