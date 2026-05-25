import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record, receivedAt = Date.now()) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: (record.triage ?? 'VERDE').toUpperCase(),
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    // Latencia puntual: cuánto tardó en llegar el evento al browser
    latency: receivedAt - new Date(record.created_at ?? receivedAt).getTime(),
    receivedAt,
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

  // Promedio de latencias puntuales (no aumenta con el tiempo)
  useEffect(() => {
    const interval = setInterval(() => {
      const list = patientsRef.current
      if (!list.length) return setAvgLatency(0)
      const valid = list
        .map((p) => p.latency)
        .filter((l) => l >= 0 && l < 30_000)
      if (!valid.length) return setAvgLatency(0)
      setAvgLatency(Math.round(valid.reduce((s, v) => s + v, 0) / valid.length))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vitales' },
        (payload) => {
          const arrivedAt = Date.now()
          const newPatient = mapVital(payload.new, arrivedAt)
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
