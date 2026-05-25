import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Calcula diferencia entre reloj Supabase y browser
async function measureClockOffset() {
  const t0 = Date.now()
  const { data } = await supabase.from('vitales').select('created_at').order('created_at', { ascending: false }).limit(1)
  const t1 = Date.now()
  if (!data?.[0]?.created_at) return 0
  const serverTs = new Date(data[0].created_at).getTime()
  const browserMid = (t0 + t1) / 2  // punto medio del roundtrip
  return serverTs - browserMid       // positivo = Supabase adelantado
}

function mapVital(record, clockOffset = 0) {
  const serverTs = new Date(record.created_at).getTime()
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    // Ajusta el timestamp del servidor al tiempo equivalente en el browser
    receivedAt: serverTs - clockOffset,
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
  const [avgLatency, setAvgLatency] = useState(0)
  const latencyWindowRef = useRef([])
  const clockOffsetRef = useRef(0)
  const channelRef = useRef(null)

  // Ping cada 3s para latencia promedio
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
    async function init() {
      // 1. Medir offset de reloj antes de cargar datos
      clockOffsetRef.current = await measureClockOffset()

      // 2. Cargar datos iniciales
      const since = new Date(Date.now() - 60_000).toISOString()
      const { data, error } = await supabase
        .from('vitales')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', since)
        .limit(100)

      if (error) { setConnectionStatus('ERROR'); return }

      const seen = new Set()
      const unique = (data ?? []).filter((r) => {
        if (seen.has(r.patient_hash)) return false
        seen.add(r.patient_hash)
        return true
      })
      setPatients(unique.map((r) => mapVital(r, clockOffsetRef.current)))
    }

    init()

    const channel = supabase
      .channel('vitales-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          const record = mapVital(payload.new, clockOffsetRef.current)
          setPatients((prev) => mergeByAmbulance(prev, record))
          setEventsReceived((prev) => prev + 1)
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
