import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with update detection
let updateSW: (reloadPage?: boolean) => Promise<void> | undefined;

if ('serviceWorker' in navigator) {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // When a new service worker is available, automatically reload
      // This ensures users always get the latest version
      console.log('New version available, reloading...');
      if (updateSW) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('Service worker registered');
      if (registration) {
        // Check for updates immediately
        registration.update();
        
        // Check for updates when app becomes visible (important for iOS home screen apps)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && registration) {
            registration.update();
          }
        });

        // Check for updates periodically (every 2 minutes)
        setInterval(() => {
          if (!document.hidden && registration) {
            registration.update();
          }
        }, 2 * 60 * 1000); // Check every 2 minutes
      }
    },
    onRegisterError(error: Error) {
      console.error('Service worker registration error:', error);
    }
  });
}

// Also check for updates on page load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update();
      }
    });
  });
}

// Expose update function globally for manual refresh (useful for debugging)
if (typeof window !== 'undefined') {
  (window as any).checkForUpdates = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
          console.log('Manually checking for updates...');
        } else {
          console.log('No service worker registration found');
        }
      });
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

