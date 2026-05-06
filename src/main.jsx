import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installErrorReporter } from './lib/errorReporter.js'

installErrorReporter()

// When a new SW takes over (after deploy), the in-memory bundle is stale —
// references chunks that no longer exist on the server. Reload once to fetch
// the fresh bundle. Timestamp gate (not boolean) so iOS PWA's sticky sessions
// can re-attempt after 5 min if a second deploy lands.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const last = parseInt(sessionStorage.getItem('sw-controller-reloaded-at') || '0', 10)
    if (Date.now() - last > 5 * 60_000) {
      sessionStorage.setItem('sw-controller-reloaded-at', String(Date.now()))
      window.location.reload()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
