import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check for service worker updates when app loads or becomes visible
// This ensures the PWA always checks for new versions
if ('serviceWorker' in navigator) {
  // Check for updates when app loads
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update()
      }
    })
  })

  // Check for updates when user returns to the app (important for iOS home screen apps)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update()
        }
      })
    }
  })

  // Also check periodically (every 5 minutes) when app is active
  setInterval(() => {
    if (!document.hidden) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update()
        }
      })
    }
  }, 5 * 60 * 1000) // Check every 5 minutes
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

