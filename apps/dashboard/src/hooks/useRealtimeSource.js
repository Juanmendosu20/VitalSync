import { useMockRealtime } from './useMockRealtime'
import { useSupabaseRealtime } from './useSupabaseRealtime'

const source =
  import.meta.env.VITE_DATA_SOURCE || 'mock'

export function useRealtimeSource() {
  const mockData = useMockRealtime()

  let supabaseData = {
    patients: [],
    eventsReceived: 0,
    connectionStatus: 'DISABLED',
  }

  try {
    supabaseData =
      useSupabaseRealtime()
  } catch (error) {
    console.error(
      'Supabase fallback:',
      error
    )
  }

  if (
    source === 'supabase' &&
    supabaseData.connectionStatus !==
      'ERROR'
  ) {
    return {
      ...supabaseData,
      source: 'SUPABASE',
    }
  }

  return {
    ...mockData,
    connectionStatus: 'MOCK',
    source: 'MOCK',
  }
}