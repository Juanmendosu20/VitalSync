import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapVital(record) {
  return {
    id: record.id,

    ambulance:
      record.ambulancia_id ??
      'AMB-??',

    patientHash:
      record.patient_hash,

    triage:
      record.triage,

    fc:
      record.fc,

    pa:
      record.pa,

    spo2:
      record.spo2 ?? 98,

    latency:
      record.created_at
        ? Math.max(
            Date.now() -
              new Date(
                record.created_at
              ).getTime(),
            0
          )
        : 0,
  }
}

export function useSupabaseRealtime() {
  const [patients, setPatients] =
    useState([])

  const [eventsReceived, setEventsReceived] =
    useState(0)

  const [connectionStatus, setConnectionStatus] =
    useState('CONNECTING')

  useEffect(() => {
    async function loadInitialData() {
      const { data, error } =
        await supabase
          .from('vitales')
          .select('*')
          .order('created_at', {
            ascending: false,
          })
          .limit(20)

      if (error) {
        console.error(
          'Error cargando vitales:',
          error
        )

        setConnectionStatus('ERROR')
        return
      }

      setPatients(
        (data ?? []).map(mapVital)
      )
    }

    loadInitialData()

    const channel = supabase
      .channel('vitales-realtime')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vitales',
        },

        (payload) => {
          const newPatient =
            mapVital(payload.new)

          setPatients((prev) => {
            const withoutDuplicate =
              prev.filter(
                (p) =>
                  p.id !==
                  newPatient.id
              )

            return [
              newPatient,
              ...withoutDuplicate,
            ].slice(0, 20)
          })

          setEventsReceived(
            (prev) => prev + 1
          )
        }
      )

      .subscribe((status) => {
        if (
          status === 'SUBSCRIBED'
        )
          setConnectionStatus(
            'LIVE'
          )

        if (
          status ===
          'CHANNEL_ERROR'
        )
          setConnectionStatus(
            'ERROR'
          )

        if (
          status === 'CLOSED'
        )
          setConnectionStatus(
            'CLOSED'
          )
      })

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [])

  return {
    patients,
    eventsReceived,
    connectionStatus,
  }
}