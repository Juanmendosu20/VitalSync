import { useEffect, useState } from 'react'

function playEmergencyAlarm() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const audioCtx = new AudioContext()

  function beep(startTime, frequency) {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, startTime)

    gainNode.gain.setValueAtTime(0.18, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + 0.18)
  }

  const now = audioCtx.currentTime

  beep(now, 880)
  beep(now + 0.25, 1040)
  beep(now + 0.5, 880)
  beep(now + 0.75, 1040)
}

export function useAlertSound(redPatients) {
  const [soundEnabled, setSoundEnabled] = useState(false)

  function enableSound() {
    playEmergencyAlarm()
    setSoundEnabled(true)
  }

  useEffect(() => {
    if (!soundEnabled) return
    if (redPatients.length === 0) return

    playEmergencyAlarm()
  }, [redPatients.length, soundEnabled])

  return {
    soundEnabled,
    enableSound,
  }
}