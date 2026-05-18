import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseCircuitBreaker() {
  const [circuitState, setCircuitState] = useState({
    state: 'UNKNOWN',
    queueSize: 0,
    lastFailure: null,
  })

  const [status, setStatus] = useState('CONNECTING')

  useEffect(() => {
    async function loadCircuitState() {
      const { data, error } = await supabase
        .from('circuit_state')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error cargando circuit_state:', error)
        setStatus('ERROR')
        return
      }

      if (data) {
        setCircuitState((prev) => ({
          ...prev,
          state: data.state ?? 'UNKNOWN',
          lastFailure: data.last_failure_at ?? null,
        }))
      }
    }

    async function loadQueueSize() {
      const { count, error } = await supabase
        .from('his_queue')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('sent', false)

      if (error) {
        console.error('Error cargando his_queue:', error)
        setStatus('ERROR')
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
        {
          event: '*',
          schema: 'public',
          table: 'circuit_state',
        },
        (payload) => {
          setCircuitState((prev) => ({
            ...prev,
            state: payload.new.state ?? 'UNKNOWN',
            lastFailure: payload.new.last_failure_at ?? null,
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'his_queue',
        },
        () => {
          loadQueueSize()
        }
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('LIVE')
        }

        if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'CLOSED'
        ) {
          setStatus('ERROR')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    circuitState,
    circuitSource: status === 'LIVE' ? 'SUPABASE' : 'SUPABASE_ERROR',
  }
}