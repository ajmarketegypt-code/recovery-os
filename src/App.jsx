import { useState, useEffect, lazy, Suspense } from 'react'
import TabBar from './components/ui/TabBar.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
const Setup     = lazy(() => import('./screens/Setup.jsx'))
const Today     = lazy(() => import('./screens/Today.jsx'))
const History   = lazy(() => import('./screens/History.jsx'))
const Nutrition = lazy(() => import('./screens/Nutrition.jsx'))
const Settings  = lazy(() => import('./screens/Settings.jsx'))
const SCREEN = { today:Today, history:History, nutrition:Nutrition, settings:Settings }

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{borderColor:'var(--color-accent)',borderTopColor:'transparent'}} />
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const [tab, setTab] = useState('today')
  // Track which tabs have been visited so they stay mounted (instant tab switching after first visit)
  const [visited, setVisited] = useState(new Set(['today']))

  useEffect(() => {
    setSetupDone(localStorage.getItem('setup_complete') === 'true')
    setReady(true)
  }, [])

  const switchTab = next => {
    setTab(next)
    setVisited(v => v.has(next) ? v : new Set([...v, next]))
  }

  if (!ready) return null
  if (!setupDone) return (
    <Suspense fallback={<Spinner />}>
      <Setup onComplete={() => { localStorage.setItem('setup_complete','true'); setSetupDone(true) }} />
    </Suspense>
  )

  return (
    <div className="min-h-screen pb-20">
      {[...visited].map(t => {
        const Screen = SCREEN[t]
        const isActive = t === tab
        return (
          <div key={t} style={{ display: isActive ? 'block' : 'none' }}>
            {/* Per-screen Suspense + ErrorBoundary — keep crashes from
                wiping the whole tree (incl. TabBar) */}
            <ErrorBoundary label={t}>
              <Suspense fallback={isActive ? <Spinner /> : null}>
                <Screen active={isActive} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )
      })}
      <TabBar active={tab} onChange={switchTab} />
    </div>
  )
}
