import { useState, useEffect, lazy, Suspense } from 'react'
import TabBar from './components/ui/TabBar.jsx'
const Setup     = lazy(() => import('./screens/Setup.jsx'))
const Today     = lazy(() => import('./screens/Today.jsx'))
const History   = lazy(() => import('./screens/History.jsx'))
const Nutrition = lazy(() => import('./screens/Nutrition.jsx'))
const Settings  = lazy(() => import('./screens/Settings.jsx'))
const SCREEN = { today:Today, history:History, nutrition:Nutrition, settings:Settings }

export default function App() {
  const [ready, setReady] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const [tab, setTab] = useState('today')
  useEffect(() => { setSetupDone(localStorage.getItem('setup_complete')==='true'); setReady(true) }, [])
  if (!ready) return null
  if (!setupDone) return (
    <Suspense fallback={null}>
      <Setup onComplete={() => { localStorage.setItem('setup_complete','true'); setSetupDone(true) }} />
    </Suspense>
  )
  const Screen = SCREEN[tab]
  return (
    <div className="min-h-screen pb-20">
      <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{color:'var(--color-muted)'}}>Loading</div>}>
        <Screen />
      </Suspense>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
