# PWA Update Guide

## How to Verify PWA is Working

### 1. Check Service Worker Registration
Open your browser's developer console (Safari on iOS: Settings > Safari > Advanced > Web Inspector) and check:
- Service worker should be registered
- Look for console logs: "Service worker registered"

### 2. Manual Update Check
In the browser console, type:
```javascript
checkForUpdates()
```
This will manually trigger an update check.

### 3. Force Update on iOS Home Screen App

If your home screen app is not updating:

**Option 1: Delete and Re-add**
1. Delete the app from your home screen
2. Open Safari and navigate to your app
3. Tap Share > Add to Home Screen
4. This will install the latest version

**Option 2: Clear Safari Cache**
1. Settings > Safari > Clear History and Website Data
2. Reopen the app from home screen
3. It should fetch the latest version

**Option 3: Hard Refresh (if app is open in Safari)**
1. While in Safari (not home screen app), pull down to refresh
2. Or close Safari completely and reopen

### 4. Verify Updates are Detected

After deploying a new version:
1. The service worker automatically checks for updates:
   - On app load
   - When app becomes visible (switching back to it)
   - Every 2 minutes while app is active
2. When an update is detected, the app automatically reloads

### 5. Check Service Worker Status

In browser console:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    console.log('Service Worker registered:', reg.active?.scriptURL);
    reg.update(); // Force update check
  } else {
    console.log('No service worker found');
  }
});
```

## Troubleshooting

### App Still Shows Old Version

1. **Check if new version is deployed**: Verify the latest code is on Firebase Hosting
2. **Clear service worker cache**: 
   - iOS: Settings > Safari > Advanced > Website Data > Remove All Website Data
   - Then re-add to home screen
3. **Check network**: Ensure you have internet connection for update check
4. **Wait a few minutes**: Updates check every 2 minutes, or when you switch back to the app

### Service Worker Not Registering

1. Check browser console for errors
2. Verify HTTPS is enabled (required for service workers)
3. Check that `vite-plugin-pwa` is properly configured
4. Rebuild the app: `npm run build`

## Current PWA Configuration

- **Update Strategy**: Auto-update (reloads automatically when new version detected)
- **Update Check Frequency**: 
  - On app load
  - When app becomes visible
  - Every 2 minutes while active
- **Cache Strategy**: NetworkFirst for all resources (always checks for updates first)
- **HTML Caching**: Disabled (always fetches fresh HTML)

## Testing Updates

1. Make a change to the app
2. Build: `npm run build`
3. Deploy to Firebase Hosting
4. Wait 2-5 minutes
5. Open the home screen app
6. The app should automatically detect and apply the update


