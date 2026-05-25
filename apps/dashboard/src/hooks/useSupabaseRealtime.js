import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record, latency = 0) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    latency, // ms que tardó el evento en viajar de Supabase al browser
  }
}

function mergeByAmbulance(prev, newRecord) {
  const without = prev.filter((p) => p.patientHash !== newRecord.patientHash)
  return [newRecord, ...without].slice(0, 50)
}

// Calcula latencia real: navegador recibe el evento y resta created_at
// Si el reloj del servidor está ligeramente adelantado, puede dar negativo → clamp a 0
// Valores esperados: 100–800 ms en condiciones normales
function calcLatency(record) {
  if (!record.created_at) return 0
  const serverTs = new Date(record.created_at).getTime()
  const diff = Date.now() - serverTs
  // Clamp: entre 0 y 5000 ms. Si da negativo es desfase de reloj (<100ms)
  return Math.min(Math.max(diff, 0), 5000)
}

export function useSupabaseRealtime() {
  const [patients, setPatients] = useState([])
  const [eventsReceived, setEventsReceived] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  // Ventana deslizante de las últimas 20 latencias reales
  const latencyWindowRef = useRef([])
  const [avgLatency, setAvgLatency] = useState(0)

  useEffect(() => {
    async function loadInitialData() {
      const since = new Date(Date.now() - 30_000).toISOString()
      const { data, error } = await supabase
        .from('vitales')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', since)
        .limit(100)

      if (error) {
        console.error('Error cargando vitales:', error)
        setConnectionStatus('ERROR')
        return
      }

      const seen = new Set()
      const unique = (data ?? []).filter((r) => {
        if (seen.has(r.patient_hash)) return false
        seen.add(r.patient_hash)
        return true
      })
      // Para datos iniciales, latencia = 0 (no medida en tiempo real)
      setPatients(unique.map((r) => mapVital(r, 0)))
    }

    loadInitialData()

    const channel = supabase
      .channel('vitales-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          // Latencia real = tiempo de viaje Supabase → browser
          const lat = calcLatency(payload.new)
          const newPatient = mapVital(payload.new, lat)

          // Ventana deslizante: guardar las últimas 20 latencias reales
          latencyWindowRef.current = [...latencyWindowRef.current, lat].slice(-20)
          const window = latencyWindowRef.current
          const avg = Math.round(window.reduce((s, v) => s + v, 0) / window.length)
          setAvgLatency(avg)

          setPatients((prev) => mergeByAmbulance(prev, newPatient))
          setEventsReceived((prev) => prev + 1)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('LIVE')
        if (status === 'CHANNEL_ERROR') setConnectionStatus('ERROR')
        if (status === 'CLOSED') setConnectionStatus('CLOSED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { patients, eventsReceived, connectionStatus, avgLatency }
}
