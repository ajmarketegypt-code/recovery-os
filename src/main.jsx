import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// When a new SW takes over (after deploy), the in-memory bundle is stale —
// references chunks that no longer exist on the server. Reload once to fetch
// the fresh bundle. Session flag prevents reload loops.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('sw-controller-reloaded')) {
      sessionStorage.setItem('sw-controller-reloaded', '1')
      window.location.reload()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
