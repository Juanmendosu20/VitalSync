/**
 * Edge Function: his-dispatcher
 * - Toma hasta 2 registros pendientes de his_queue (rate limit HIS = 2 req/seg)
 * - Intenta enviarlos al HIS Mock
 * - Implementa lógica Circuit Breaker: CLOSED → OPEN → HALF_OPEN → CLOSED
 * - Actualiza circuit_state en Supabase en tiempo real
 *
 * Se invoca vía pg_cron cada 30 segundos (Free Tier no soporta <1 min en pg_cron)
 * Dentro del handler hace 2 envíos con 500ms de pausa = respeta 2 req/seg
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const HIS_URL      = Deno.env.get('HIS_MOCK_URL') ?? 'https://vital-sync.vercel.app/api/his-mock'

// Umbrales Circuit Breaker
const FAILURE_THRESHOLD  = 3   // fallos consecutivos para abrir circuito
const HALF_OPEN_TIMEOUT  = 60  // segundos antes de intentar HALF_OPEN
const SUCCESS_THRESHOLD  = 2   // éxitos en HALF_OPEN para cerrar circuito

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Leer estado actual del Circuit Breaker
  const { data: cb } = await supabase
    .from('circuit_state')
    .select('*')
    .limit(1)
    .maybeSingle()

  const state          = cb?.state ?? 'CLOSED'
  const failureCount   = cb?.failure_count ?? 0
  const successCount   = cb?.success_count ?? 0
  const lastFailureAt  = cb?.last_failure_at ? new Date(cb.last_failure_at) : null
  const now            = new Date()

  // 2. Lógica de estado
  if (state === 'OPEN') {
    const secondsOpen = lastFailureAt
      ? (now.getTime() - lastFailureAt.getTime()) / 1000
      : 999

    if (secondsOpen < HALF_OPEN_TIMEOUT) {
      console.log(`[CB] OPEN — esperando ${Math.round(HALF_OPEN_TIMEOUT - secondsOpen)}s más`)
      return new Response(JSON.stringify({ state: 'OPEN', skipped: true }), { status: 200 })
    }

    // Transición OPEN → HALF_OPEN
    await updateCircuitState(supabase, { state: 'HALF_OPEN', success_count: 0 })
    console.log('[CB] Transición → HALF_OPEN')
  }

  // 3. Tomar hasta 2 registros pendientes de la cola
  const { data: jobs } = await supabase
    .from('his_queue')
    .select('*')
    .eq('sent', false)
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(state === 'HALF_OPEN' ? 1 : 2)  // HALF_OPEN: solo 1 prueba

  if (!jobs || jobs.length === 0) {
    console.log('[CB] Cola vacía — nada que procesar')
    return new Response(JSON.stringify({ state, processed: 0 }), { status: 200 })
  }

  let consecutiveFailures = failureCount
  let consecutiveSuccesses = successCount

  for (const job of jobs) {
    try {
      const res = await fetch(HIS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: job.id,
          patient_hash: job.patient_hash,
          hospital_id: job.hospital_id,
          payload: job.payload,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        // ÉXITO
        consecutiveFailures = 0
        consecutiveSuccesses++

        await supabase
          .from('his_queue')
          .update({ sent: true, status: 'delivered', updated_at: now.toISOString() })
          .eq('id', job.id)

        console.log(`[CB] ✅ Job ${job.id} entregado al HIS`)

        if (state === 'HALF_OPEN' && consecutiveSuccesses >= SUCCESS_THRESHOLD) {
          await updateCircuitState(supabase, {
            state: 'CLOSED',
            failure_count: 0,
            success_count: 0,
            last_failure_at: null,
          })
          console.log('[CB] Transición → CLOSED ✅')
        } else {
          await updateCircuitState(supabase, { success_count: consecutiveSuccesses })
        }
      } else {
        throw new Error(`HIS respondió ${res.status}`)
      }
    } catch (err) {
      // FALLO
      consecutiveFailures++
      consecutiveSuccesses = 0

      await supabase
        .from('his_queue')
        .update({
          attempts: (job.attempts ?? 0) + 1,
          status: 'failed',
          updated_at: now.toISOString(),
        })
        .eq('id', job.id)

      console.log(`[CB] ❌ Job ${job.id} falló: ${err.message}`)

      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        await updateCircuitState(supabase, {
          state: 'OPEN',
          failure_count: consecutiveFailures,
          success_count: 0,
          last_failure_at: now.toISOString(),
        })
        console.log('[CB] Transición → OPEN ⚠️')
        break  // no intentar más jobs con circuito abierto
      } else {
        await updateCircuitState(supabase, {
          failure_count: consecutiveFailures,
          last_failure_at: now.toISOString(),
        })
      }
    }

    // Respetar rate limit: 500ms entre requests = máx 2 req/seg
    await new Promise((r) => setTimeout(r, 500))
  }

  return new Response(
    JSON.stringify({ state, processed: jobs.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

async function updateCircuitState(supabase: any, patch: Record<string, any>) {
  const { data: existing } = await supabase
    .from('circuit_state')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('circuit_state')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('circuit_state')
      .insert({ ...patch, updated_at: new Date().toISOString() })
  }
}
