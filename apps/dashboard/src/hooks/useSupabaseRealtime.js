import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    serverTs: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
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
  const patientsRef = useRef([])

  useEffect(() => {
    patientsRef.current = patients
  }, [patients])

  // Recalcula latencia cada segundo — clamp entre 0 y 30 000 ms
  useEffect(() => {
    const interval = setInterval(() => {
      const list = patientsRef.current
      if (!list.length) return setAvgLatency(0)
      const now = Date.now()
      const values = list.map((p) => Math.min(Math.max(now - p.serverTs, 0), 30_000))
      const avg = values.reduce((s, v) => s + v, 0) / values.length
      setAvgLatency(Math.round(avg))
    }, 1000)
    return () => clearInterval(interval)
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

      setPatients(unique.map(mapVital))
    }

    loadInitialData()

    const channel = supabase
      .channel('vitales-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          const newPatient = mapVital(payload.new)
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
