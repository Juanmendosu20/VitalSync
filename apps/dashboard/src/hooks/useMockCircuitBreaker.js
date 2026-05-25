/**
 * useMockCircuitBreaker — lee el estado REAL del HIS Mock API
 * y deriva el estado del Circuit Breaker a partir de él.
 *
 * CLOSED   → HIS UP  (operativo, 0 fallos recientes)
 * OPEN     → HIS DOWN (caido, circuito abierto, peticiones en cola)
 * HALF_OPEN → HIS vuelve UP después de haber estado DOWN (ventana de prueba)
 */
import { useEffect, useRef, useState } from 'react'

const HIS_URL = '/api/his-mock'
const POLL_MS = 4000        // revisa cada 4 seg
const HALF_OPEN_WINDOW = 12000 // 12 seg en HALF_OPEN antes de cerrar

export function useMockCircuitBreaker() {
  const [circuitState, setCircuitState] = useState({
    state: 'CLOSED',
    queueSize: 0,
    lastFailure: null,
  })

  const prevHisDown = useRef(false)
  const halfOpenTimer = useRef(null)
  const queueRef = useRef(0)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(HIS_URL)
        const data = await res.json()
        const isDown = data.his_status === 'DOWN'

        if (isDown) {
          // HIS caido → OPEN, acumular cola simulada
          queueRef.current = Math.min(queueRef.current + 2, 50)
          clearTimeout(halfOpenTimer.current)
          prevHisDown.current = true
          setCircuitState({
            state: 'OPEN',
            queueSize: queueRef.current,
            lastFailure: new Date().toLocaleTimeString('es-CO'),
          })
        } else if (prevHisDown.current) {
          // HIS acaba de recuperarse → HALF_OPEN por 12 seg
          prevHisDown.current = false
          setCircuitState(prev => ({
            state: 'HALF_OPEN',
            queueSize: queueRef.current,
            lastFailure: prev.lastFailure,
          }))
          halfOpenTimer.current = setTimeout(() => {
            // Drain la cola y cerrar el circuito
            queueRef.current = 0
            setCircuitState(prev => ({
              state: 'CLOSED',
              queueSize: 0,
              lastFailure: prev.lastFailure,
            }))
          }, HALF_OPEN_WINDOW)
        } else {
          // HIS UP sin haber estado DOWN → CLOSED normal
          queueRef.current = 0
          setCircuitState(prev =>
            prev.state === 'CLOSED' && prev.queueSize === 0
              ? prev  // sin cambio, evitar re-render
              : { state: 'CLOSED', queueSize: 0, lastFailure: prev.lastFailure }
          )
        }
      } catch {
        // Error de red → tratar como DOWN
        queueRef.current = Math.min(queueRef.current + 1, 50)
        setCircuitState(prev => ({
          state: 'OPEN',
          queueSize: queueRef.current,
          lastFailure: new Date().toLocaleTimeString('es-CO'),
        }))
      }
    }

    poll() // primer check inmediato
    const interval = setInterval(poll, POLL_MS)
    return () => {
      clearInterval(interval)
      clearTimeout(halfOpenTimer.current)
    }
  }, [])

  return {
    circuitState,
    circuitSource: 'HIS-API',
  }
}
