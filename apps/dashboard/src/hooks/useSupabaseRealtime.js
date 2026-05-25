import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record, arrivalTime) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    // Latencia fija: momento en que llego al browser - cuando fue insertado en Supabase
    latency: Math.max(0, arrivalTime - new Date(record.created_at).getTime()),
  }
}

function mergeByAmbulance(prev, newRecord) {
  const without = prev.filter((p) => p.patientHash !== newRecord.patientHash)
  return [newRecord, ...without].slice(0, 50)
}

export function useSupabaseRealtime() {
  const [patients, setPatients] = useState([])
  const [eventsReceived, setEventsReceived] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const [avgLatency, setAvgLatency] = useState(null)
  const latencyWindowRef = useRef([])
  const channelRef = useRef(null)

  // Ping cada 3s para latencia promedio global
  useEffect(() => {
    const pingInterval = setInterval(async () => {
      const t0 = Date.now()
      try {
        await supabase.from('vitales').select('id').limit(1)
        const rtt = Date.now() - t0
        latencyWindowRef.current = [...latencyWindowRef.current, rtt].slice(-10)
        const win = latencyWindowRef.current
        setAvgLatency(Math.round(win.reduce((s, v) => s + v, 0) / win.length))
      } catch (_) {}
    }, 3000)
    return () => clearInterval(pingInterval)
  }, [])

  useEffect(() => {
    async function loadInitialData() {
      const since = new Date(Date.now() - 60_000).toISOString()
      const { data, error } = await supabase
        .from('vitales')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', since)
        .limit(100)

      if (error) { setConnectionStatus('ERROR'); return }

      const now = Date.now()
      const seen = new Set()
      const unique = (data ?? []).filter((r) => {
        if (seen.has(r.patient_hash)) return false
        seen.add(r.patient_hash)
        return true
      })
      setPatients(unique.map((r) => mapVital(r, now)))
    }

    loadInitialData()

    const channel = supabase
      .channel('vitales-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          // arrivalTime = exactamente cuando llego el evento al browser
          const arrivalTime = Date.now()
          const record = mapVital(payload.new, arrivalTime)
          setPatients((prev) => mergeByAmbulance(prev, record))
          setEventsReceived((prev) => prev + 1)
          // Acumular en ventana para promedio
          latencyWindowRef.current = [...latencyWindowRef.current, record.latency].slice(-20)
          const win = latencyWindowRef.current
          setAvgLatency(Math.round(win.reduce((s, v) => s + v, 0) / win.length))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('LIVE')
        if (status === 'CHANNEL_ERROR') setConnectionStatus('ERROR')
        if (status === 'CLOSED') setConnectionStatus('CLOSED')
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  return { patients, eventsReceived, connectionStatus, avgLatency }
}
