import { useState } from 'react'
import { useJourney } from './hooks/useJourney.js'
import Onboarding from './onboarding/Onboarding.jsx'
import BottomNav from './components/layout/BottomNav.jsx'
import Home from './screens/Home.jsx'
import Today from './screens/Today.jsx'
import Workout from './screens/Workout.jsx'
import Progress from './screens/Progress.jsx'
import Journal from './screens/Journal.jsx'
import Settings from './screens/Settings.jsx'
import PhaseUnlock from './components/moments/PhaseUnlock.jsx'
import MissedDay from './components/moments/MissedDay.jsx'
import Day60Finale from './components/moments/Day60Finale.jsx'
import { getDayLog } from './data/storage.js'

const SCREENS = { home: Home, today: Today, workout: Workout, progress: Progress, journal: Journal, settings: Settings }

export default function App() {
  const journey = useJourney()
  const [onboarded, setOnboarded] = useState(!journey.notStarted)
  const [activeTab, setActiveTab] = useState('home')
  const [momentSeen, setMomentSeen] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return localStorage.getItem(`ros_moment_${today}`) === 'seen'
  })

  if (!onboarded || journey.notStarted) {
    return (
      <Onboarding
        onComplete={() => {
          journey.startJourney?.()
          setOnboarded(true)
        }}
      />
    )
  }

  const dismissMoment = () => {
    localStorage.setItem(`ros_moment_${journey.today}`, 'seen')
    setMomentSeen(true)
  }

  if (!momentSeen && journey.dayNumber) {
    if (journey.dayNumber === 60) {
      return <Day60Finale protocol={getDayLog(journey.today).protocol} onClose={dismissMoment} />
    }
    if (journey.dayNumber === 15 || journey.dayNumber === 43) {
      return <PhaseUnlock phase={journey.phase} onContinue={dismissMoment} />
    }
    if (journey.streak === 0 && journey.dayNumber > 2) {
      return <MissedDay onContinue={dismissMoment} />
    }
  }

  const Screen = SCREENS[activeTab]

  return (
    <div className="min-h-screen bg-base text-textPrimary">
      <div className="pb-20">
        <Screen journey={journey} onTabSelect={setActiveTab} />
      </div>
      <BottomNav active={activeTab} onSelect={setActiveTab} />
    </div>
  )
}
