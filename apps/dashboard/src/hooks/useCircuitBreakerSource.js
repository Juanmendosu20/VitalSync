import { useMockCircuitBreaker } from './useMockCircuitBreaker'
import { useSupabaseCircuitBreaker } from './useSupabaseCircuitBreaker'

const source = import.meta.env.VITE_DATA_SOURCE || 'mock'

export function useCircuitBreakerSource() {
  const mockCircuit = useMockCircuitBreaker()
  const supabaseCircuit = useSupabaseCircuitBreaker()

  if (
    source === 'supabase' &&
    supabaseCircuit.circuitSource === 'SUPABASE'
  ) {
    return supabaseCircuit
  }

  return mockCircuit
}