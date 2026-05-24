import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseCircuitBreaker() {
  const [circuitState, setCircuitState] = useState({
    state: 'CLOSED',
    queueSize: 0,
    lastFailure: null,
  })

  const [status, setStatus] = useState('CONNECTING')

  useEffect(() => {
    async function loadCircuitState() {
      const { data, error } = await supabase
        .from('circuit_state')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error cargando circuit_state:', error)
        // No bloquear el dashboard por este error — usar valor por defecto
        return
      }

      if (data) {
        setCircuitState((prev) => ({
          ...prev,
          state: data.state ?? 'CLOSED',
          lastFailure: data.last_failure_at ?? null,
        }))
      }
    }

    async function loadQueueSize() {
      // Contar todos los registros pendientes (is_sent = false o columna no existe)
      const { count, error } = await supabase
        .from('his_queue')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Error cargando his_queue:', error)
        // No bloquear el dashboard
        return
      }

      setCircuitState((prev) => ({
        ...prev,
        queueSize: count ?? 0,
      }))
    }

    loadCircuitState()
    loadQueueSize()

    const channel = supabase
      .channel('circuit-breaker-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'circuit_state' },
        (payload) => {
          if (!payload?.new) return
          setCircuitState((prev) => ({
            ...prev,
            state: payload.new.state ?? 'CLOSED',
            lastFailure: payload.new.last_failure_at ?? null,
          }))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'his_queue' },
        () => { loadQueueSize() }
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') setStatus('LIVE')
        if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'CLOSED') setStatus('ERROR')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  return {
    circuitState,
    circuitSource: status === 'LIVE' ? 'SUPABASE' : 'SUPABASE_ERROR',
  }
}
