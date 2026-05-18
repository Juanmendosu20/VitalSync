import { useEffect, useState } from 'react'

const states = ['CLOSED', 'OPEN', 'HALF_OPEN']

export function useMockCircuitBreaker() {
  const [circuitState, setCircuitState] = useState({
    state: 'CLOSED',
    queueSize: 2,
    lastFailure: null,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setCircuitState((prev) => {
        const currentIndex = states.indexOf(prev.state)
        const nextState = states[(currentIndex + 1) % states.length]

        return {
          state: nextState,
          queueSize:
            nextState === 'CLOSED'
              ? 1
              : nextState === 'HALF_OPEN'
                ? 4
                : 8,
          lastFailure:
            nextState === 'OPEN'
              ? new Date().toLocaleTimeString('es-CO')
              : prev.lastFailure,
        }
      })
    }, 9000)

    return () => clearInterval(interval)
  }, [])

  return {
    circuitState,
    circuitSource: 'MOCK',
  }
}