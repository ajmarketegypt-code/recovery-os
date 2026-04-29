import { useState } from 'react'
import { getJourneyStart, setJourneyStart, getDayLog } from '../data/storage.js'
import { getDayNumber, getPhase } from '../data/phases.js'

export const useJourney = () => {
  const [journeyStart, setStart] = useState(() => getJourneyStart())
  const today = new Date().toISOString().split('T')[0]

  const startJourney = (isoDate = today) => {
    setJourneyStart(isoDate)
    setStart(isoDate)
  }

  if (!journeyStart) return { notStarted: true, startJourney }

  const dayNumber = getDayNumber(journeyStart, today)
  const phase = getPhase(dayNumber)

  let streak = 0
  let checking = new Date(today)
  checking.setDate(checking.getDate() - 1)
  while (streak < 60) {
    const isoDate = checking.toISOString().split('T')[0]
    if (!getDayLog(isoDate).workoutDone) break
    streak++
    checking.setDate(checking.getDate() - 1)
  }
  if (getDayLog(today).workoutDone) streak++

  return { notStarted: false, dayNumber, phase, streak, today, journeyStart, startJourney }
}
