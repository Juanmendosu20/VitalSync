import { useEffect, useState } from 'react'

const initialPatients = [
  {
    ambulance: 'AMB-07',
    patientHash: 'a3f2c81d9e...8b1c',
    triage: 'ROJO',
    fc: 142,
    pa: '60/40',
    spo2: 94,
    latency: 684,
  },
  {
    ambulance: 'AMB-03',
    patientHash: 'f71a002e4c...3d9f',
    triage: 'AMARILLO',
    fc: 98,
    pa: '100/65',
    spo2: 97,
    latency: 821,
  },
  {
    ambulance: 'AMB-12',
    patientHash: 'c90b3e5f11...a2d4',
    triage: 'VERDE',
    fc: 72,
    pa: '120/80',
    spo2: 99,
    latency: 433,
  },
]

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomTriage() {
  const values = ['ROJO', 'AMARILLO', 'VERDE']
  return values[randomBetween(0, 2)]
}

export function useMockRealtime() {
  const [patients, setPatients] = useState(initialPatients)
  const [eventsReceived, setEventsReceived] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPatients((prev) =>
        prev.map((patient) => {
          const triage = randomTriage()

          return {
            ...patient,
            triage,
            fc: randomBetween(60, 150),
            pa: `${randomBetween(60, 130)}/${randomBetween(40, 90)}`,
            spo2: randomBetween(88, 100),
            latency: randomBetween(200, 1200),
          }
        })
      )

      setEventsReceived((prev) => prev + 1)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return {
    patients,
    eventsReceived,
  }
}