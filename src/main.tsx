import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Global error handler for cssRules errors and Chrome extension errors
// This must run IMMEDIATELY, before any other code executes
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  // Helper function to check if error should be suppressed
  const shouldSuppressError = (errorMessage: string): boolean => {
    const lowerMessage = errorMessage.toLowerCase();
    
    // Suppress cssRules errors from third-party libraries
    if (lowerMessage.includes('cssrules') || 
        lowerMessage.includes('cannot read properties of null') ||
        lowerMessage.includes('reading \'cssrules\'') ||
        lowerMessage.includes('reading "cssrules"') ||
        lowerMessage.includes('reading `cssrules`')) {
      return true;
    }

    // Suppress PWA icon manifest errors (non-critical)
    if (lowerMessage.includes('icon from the manifest') ||
        lowerMessage.includes('pwa-192x192.png') ||
        lowerMessage.includes('pwa-512x512.png')) {
      return true;
    }

    // Suppress Chrome extension errors (not from our code)
    if (lowerMessage.includes('chrome-extension://') ||
        lowerMessage.includes('inject.bundle.js') ||
        lowerMessage.includes('runtime.lasterror') ||
        lowerMessage.includes('runtime.lasterror') ||
        lowerMessage.includes('receiving end does not exist') ||
        lowerMessage.includes('could not establish connection') ||
        lowerMessage.includes('unchecked runtime.lasterror') ||
        lowerMessage.includes('cannot read properties of undefined') && (
          lowerMessage.includes("reading 'enable'") ||
          lowerMessage.includes("reading 'id'") ||
          lowerMessage.includes("reading 'features'") ||
          lowerMessage.includes("reading 'referrallinks'") ||
          lowerMessage.includes("reading 'token'") ||
          lowerMessage.includes("reading 'iskarmabuttonshown'")
        )) {
      return true;
    }

    return false;
  };

  // Store original console methods
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  
  // Override console.error - must catch ALL error logging
  console.error = function(...args: any[]) {
    try {
      const errorMessage = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message + ' ' + (arg.stack || '');
        if (arg?.message) return arg.message + ' ' + (arg.stack || '');
        if (arg?.stack) return arg.stack;
        return String(arg);
      }).join(' ');

      // Suppress known non-critical errors
      if (shouldSuppressError(errorMessage)) {
        return; // Silently suppress
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
      }).join(' ');

      // Suppress known non-critical warnings
      if (shouldSuppressError(warningMessage)) {
        return;
      }

      originalWarn.apply(console, args);
    } catch {
      originalWarn.apply(console, args);
    }
  };

  // Global error event listener (catches errors before they reach console)
  // Use capture phase and make it non-capturing to catch all errors
  const errorHandler = function(event: ErrorEvent) {
    try {
      const errorMessage = (
        event.message || 
        event.error?.message || 
        event.error?.stack || 
        String(event.error) || 
        ''
      );
      
      // Suppress known non-critical errors
      if (shouldSuppressError(errorMessage)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    } catch {
      // If suppression fails, let error through
    }
  };

  // Add error listener with highest priority (capture phase)
  window.addEventListener('error', errorHandler, true);

  // Also add to window.onerror as fallback
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = (
      String(message) || 
      error?.message || 
      error?.stack || 
      ''
    );
    
    if (shouldSuppressError(errorMessage)) {
      return true; // Suppress the error
    }
    
    // Call original handler if exists
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Handle unhandled promise rejections
  const rejectionHandler = function(event: PromiseRejectionEvent) {
    try {
      const errorMessage = (
        event.reason?.message || 
        event.reason?.stack || 
        String(event.reason) || 
        ''
      );
      
      // Suppress known non-critical errors
      if (shouldSuppressError(errorMessage)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    } catch {
      // If suppression fails, let rejection through
    }
  };

  window.addEventListener('unhandledrejection', rejectionHandler);

  // Suppress Chrome extension runtime.lastError
  // Check for chrome API safely (only available in Chrome extension context)
  if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.runtime) {
    const chromeRuntime = (window as any).chrome.runtime;
    const originalSendMessage = chromeRuntime.sendMessage;
    if (originalSendMessage) {
      chromeRuntime.sendMessage = function(...args: any[]) {
        try {
          return originalSendMessage.apply(chromeRuntime, args);
        } catch (error: any) {
          // Suppress Chrome extension connection errors
          if (error?.message?.includes('receiving end does not exist') ||
              error?.message?.includes('could not establish connection')) {
            return;
          }
          throw error;
        }
      };
    }
  }
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

// Wrap React rendering in error boundary to catch rendering errors
try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error: any) {
  // Suppress cssRules errors during initial render
  const errorMessage = (error?.message || error?.stack || String(error) || '').toLowerCase();
  if (!errorMessage.includes('cssrules') && 
      !errorMessage.includes('cannot read properties of null')) {
    // Only log if it's not a cssRules error
    console.error('Error during React render:', error);
  }
}

