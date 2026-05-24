/**
 * useCircuitBreakerSource
 *
 * SIEMPRE usa useMockCircuitBreaker que lee /api/his-mock en tiempo real.
 * El estado de Supabase (circuit_state) es una tabla auxiliar que no se
 * actualiza desde el botón del panel, por lo que no reflejaría la demo.
 *
 * Si en el futuro se quiere que Supabase también persista el estado,
 * hay que actualizar la tabla desde el botón ⚡/✅ del HisControlPanel.
 */
import { useMockCircuitBreaker } from './useMockCircuitBreaker'

export function useCircuitBreakerSource() {
  return useMockCircuitBreaker()
}
