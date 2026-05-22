import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Mapea columnas reales de Supabase al formato del dashboard
function mapVital(record) {
  return {
    id: record.id,
    ambulance: record.ambulancia_id ?? record.patient_hash?.slice(0, 8) ?? 'AMB-??',
    patientHash: record.patient_hash,
    triage: record.triage ?? 'Verde',
    fc: record.frecuencia_cardiaca ?? record.fc ?? 0,
    pa: record.presion_arterial ?? record.pa ?? '0/0',
    spo2: record.spo2 ?? 98,
    latency: record.created_at
      ? Math.max(Date.now() - new Date(record.created_at).getTime(), 0)
      : 0,
  }
}

// Mantiene solo el ultimo vital por ambulancia (1 tarjeta por ambulancia)
function mergeByAmbulance(prev, newRecord) {
  const without = prev.filter((p) => p.patientHash !== newRecord.patientHash)
  return [newRecord, ...without].slice(0, 50)
}

export function useSupabaseRealtime() {
  const [patients, setPatients] = useState([])
  const [eventsReceived, setEventsReceived] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')

  useEffect(() => {
    async function loadInitialData() {
      // Carga el ultimo registro de cada ambulancia
      const { data, error } = await supabase
        .from('vitales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error cargando vitales:', error)
        setConnectionStatus('ERROR')
        return
      }

      // Deduplica: solo el mas reciente por patient_hash
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

  return { patients, eventsReceived, connectionStatus }
}
