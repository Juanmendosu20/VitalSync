import { useMockRealtime } from './useMockRealtime'
import { useSupabaseRealtime } from './useSupabaseRealtime'

const dataSource = import.meta.env.VITE_DATA_SOURCE || 'mock'

export function useRealtimeSource() {
  const mockData = useMockRealtime()
  const supabaseData = useSupabaseRealtime()

  // Si la variable dice 'supabase', usar Supabase siempre
  // (aunque el estado sea CONNECTING, no caer al mock)
  if (dataSource === 'supabase') {
    return {
      ...supabaseData,
      source: 'SUPABASE',
    }
  }

  // Fallback: datos mock para desarrollo local
  return {
    ...mockData,
    connectionStatus: 'MOCK',
    source: 'MOCK',
  }
}
