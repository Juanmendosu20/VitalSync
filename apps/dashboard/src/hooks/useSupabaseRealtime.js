import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record, latency = null) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    latency, // ms del ultimo INSERT de esta ambulancia (null = cargado al inicio)
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

  // Ping cada 3s — mide RTT real y lo guarda para usarlo en tarjetas nuevas
  useEffect(() => {
    const doPing = async () => {
      const t0 = Date.now()
      try {
        await supabase.from('vitales').select('id').limit(1)
        const rtt = Date.now() - t0
        latencyWindowRef.current = [...latencyWindowRef.current, rtt].slice(-10)
        const win = latencyWindowRef.current
        setAvgLatency(Math.round(win.reduce((s, v) => s + v, 0) / win.length))
      } catch (_) {}
    }
    doPing()
    const t = setInterval(doPing, 3000)
    return () => clearInterval(t)
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

      const seen = new Set()
      const unique = (data ?? []).filter((r) => {
        if (seen.has(r.patient_hash)) return false
        seen.add(r.patient_hash)
        return true
      })
      // Datos historicos: latency null → muestra '--'
      setPatients(unique.map((r) => mapVital(r, null)))
    }

    loadInitialData()

    const channel = supabase
      .channel('vitales-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          // Medir RTT de este INSERT especifico
          const t0 = Date.now()
          supabase.from('vitales').select('id').eq('id', payload.new.id).single().then(() => {
            const rtt = Date.now() - t0
            latencyWindowRef.current = [...latencyWindowRef.current, rtt].slice(-20)
            const win = latencyWindowRef.current
            const avg = Math.round(win.reduce((s, v) => s + v, 0) / win.length)
            setAvgLatency(avg)
            const record = mapVital(payload.new, rtt)
            setPatients((prev) => mergeByAmbulance(prev, record))
          })
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
