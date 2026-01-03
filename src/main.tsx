import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Global error handler for cssRules errors (from third-party libraries)
// This must run IMMEDIATELY, before any other code executes
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  // Store original console methods
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalLog = console.log.bind(console);
  
  // Override console.error - must catch ALL error logging
  console.error = function(...args: any[]) {
    try {
      const errorMessage = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message + ' ' + (arg.stack || '');
        if (arg?.message) return arg.message + ' ' + (arg.stack || '');
        if (arg?.stack) return arg.stack;
        return String(arg);
      }).join(' ').toLowerCase();

      // Suppress cssRules errors from third-party libraries
      if (errorMessage.includes('cssrules') || 
          errorMessage.includes('cannot read properties of null') ||
          errorMessage.includes('reading \'cssrules\'') ||
          errorMessage.includes('reading "cssrules"')) {
        return; // Silently suppress
      }

      // Filter out PWA icon manifest errors (non-critical)
      if (errorMessage.includes('icon from the manifest')) {
        return; // Suppress this error
      }

      originalError.apply(console, args);
    } catch {
      // If our filter fails, still log the error
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = function(...args: any[]) {
    try {
      const warningMessage = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        if (arg?.message) return arg.message;
        return String(arg);
      }).join(' ').toLowerCase();

      // Suppress cssRules warnings
      if (warningMessage.includes('cssrules')) {
        return;
      }

      originalWarn.apply(console, args);
    } catch {
      originalWarn.apply(console, args);
    }
  };

  // Global error event listener (catches errors before they reach console)
  window.addEventListener('error', function(event) {
    try {
      const errorMessage = (
        event.message || 
        event.error?.message || 
        event.error?.stack || 
        String(event.error) || 
        ''
      ).toLowerCase();
      
      // Suppress cssRules errors from third-party libraries
      if (errorMessage.includes('cssrules') || 
          errorMessage.includes('cannot read properties of null') ||
          errorMessage.includes('reading \'cssrules\'') ||
          errorMessage.includes('reading "cssrules"')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    } catch {
      // If suppression fails, let error through
    }
  }, true); // Use capture phase to catch early

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    try {
      const errorMessage = (
        event.reason?.message || 
        event.reason?.stack || 
        String(event.reason) || 
        ''
      ).toLowerCase();
      
      // Suppress cssRules errors in promise rejections
      if (errorMessage.includes('cssrules') || 
          errorMessage.includes('cannot read properties of null') ||
          errorMessage.includes('reading \'cssrules\'') ||
          errorMessage.includes('reading "cssrules"')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    } catch {
      // If suppression fails, let rejection through
    }
  });
})();

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

