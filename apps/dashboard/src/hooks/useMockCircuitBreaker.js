import { useEffect, useRef, useState } from 'react'

const HALF_OPEN_DELAY_MS = 5000
const DRAIN_INTERVAL_MS = 800
const MAX_REQ_PER_SECOND = 2
const BURST_SIZE = 5

export function useMockCircuitBreaker() {
  const [circuitState, setCircuitState] = useState({
    state: 'CLOSED',
    queueSize: 0,
    lastFailure: null,
    processedFromQueue: 0,
    processedEvents: [],
  })

  const queueRef = useRef([])
  const timestampsRef = useRef([])
  const halfOpenTimer = useRef(null)
  const drainTimer = useRef(null)
  const circuitRef = useRef('CLOSED')

  const setCircuit = (state) => {
    circuitRef.current = state
    setCircuitState((prev) => ({
      ...prev,
      state,
      queueSize: queueRef.current.length,
    }))
  }

  const openCircuit = () => {
    if (circuitRef.current === 'OPEN') return

    clearTimeout(halfOpenTimer.current)
    clearInterval(drainTimer.current)

    circuitRef.current = 'OPEN'

    setCircuitState((prev) => ({
      ...prev,
      state: 'OPEN',
      queueSize: queueRef.current.length,
      lastFailure: new Date().toLocaleTimeString('es-CO'),
    }))

    halfOpenTimer.current = setTimeout(() => {
      setCircuit('HALF_OPEN')

      setTimeout(() => {
        startDrainQueue()
      }, 2500)
    }, HALF_OPEN_DELAY_MS)
  }

  const startDrainQueue = () => {
    clearInterval(drainTimer.current)
    setCircuit('CLOSED')

    drainTimer.current = setInterval(() => {
      if (queueRef.current.length === 0) {
        clearInterval(drainTimer.current)
        setCircuit('CLOSED')
        return
      }

      const item = queueRef.current.shift()

      setCircuitState((prev) => ({
        ...prev,
        state: 'CLOSED',
        queueSize: queueRef.current.length,
        processedFromQueue: prev.processedFromQueue + 1,
        processedEvents: [
          {
            id: item.id,
            ambulance: item.ambulance,
            patientHash: item.patientHash,
            triage: item.triage,
            sentAt: new Date().toLocaleTimeString('es-CO'),
          },
          ...prev.processedEvents,
        ].slice(0, 5),
      }))
    }, DRAIN_INTERVAL_MS)
  }

  const enqueueRequest = (payload) => {
    queueRef.current.push({
      id: payload.id ?? `REQ-${Date.now()}-${Math.random()}`,
      ambulance: payload.ambulance ?? 'AMB-UNKNOWN',
      patientHash: payload.patientHash ?? 'patient_hash_demo',
      triage: payload.triage ?? 'VERDE',
      createdAt: new Date().toLocaleTimeString('es-CO'),
    })

    openCircuit()
  }

  const handleIncomingVital = (payload) => {
    const now = Date.now()

    timestampsRef.current = timestampsRef.current.filter(
      (timestamp) => now - timestamp < 1000
    )

    timestampsRef.current.push(now)

    if (timestampsRef.current.length > MAX_REQ_PER_SECOND) {
      enqueueRequest(payload)
    }
  }

  const simulateHisOverload = () => {
    const triageValues = ['ROJO', 'AMARILLO', 'VERDE']

    Array.from({ length: BURST_SIZE }).forEach((_, index) => {
      enqueueRequest({
        id: `REQ-${Date.now()}-${index}`,
        ambulance: `AMB-DEMO-${index + 1}`,
        patientHash: `demo_hash_${Math.random().toString(16).slice(2, 10)}`,
        triage: triageValues[index % triageValues.length],
      })
    })
  }

  useEffect(() => {
    const overloadHandler = () => {
      simulateHisOverload()
    }

    const vitalHandler = (event) => {
      handleIncomingVital(event.detail)
    }

    window.addEventListener('simulate-his-overload', overloadHandler)
    window.addEventListener('vitalsync-vital-received', vitalHandler)

    return () => {
      window.removeEventListener('simulate-his-overload', overloadHandler)
      window.removeEventListener('vitalsync-vital-received', vitalHandler)
      clearTimeout(halfOpenTimer.current)
      clearInterval(drainTimer.current)
    }
  }, [])

  return {
    circuitState,
    circuitSource: 'HIS-QUEUE',
  }
}