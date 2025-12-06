# Deployment Troubleshooting Guide

## How GitHub Actions + Firebase Hosting Works

### Automatic Deployment Flow:
1. **You push code to `main` branch** → Triggers GitHub Actions workflow
2. **GitHub Actions runs** → Builds your app (`npm ci && npm run build`)
3. **Firebase deploys** → Uploads `dist` folder to Firebase Hosting
4. **Site updates** → Usually takes 1-3 minutes after push

### Current Workflow Configuration:
- **Trigger**: Push to `main` branch
- **Build**: `npm ci && npm run build`
- **Deploy**: Firebase Hosting `live` channel
- **Project**: `myhub-d0f5a`

## Troubleshooting Steps

### 1. Verify Latest Commit Was Deployed

Check if your latest commit (`ffc2d88 - Bugs fixes`) actually triggered a deployment:

1. Go to GitHub → Your repo → **Actions** tab
2. Look for the most recent workflow run
3. Click on it to see the details
4. Check if it completed successfully (green checkmark)
5. Look at the "Deploy to Firebase Hosting" step logs

### 2. Check Firebase Hosting Releases

1. Go to [Firebase Console](https://console.firebase.google.com/project/myhub-d0f5a/hosting)
2. Check the **"Current release"** section
3. Look at the release ID and timestamp
4. Compare with your latest commit time

**If the release timestamp doesn't match your latest push**, the deployment didn't happen.

### 3. Clear Browser Cache

Your browser might be showing a cached version:

**On Desktop:**
- **Chrome/Edge**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

**On Mobile:**
- **Chrome**: Settings → Privacy → Clear browsing data → Cached images and files
- Or: Use incognito/private mode to test

### 4. Check Workflow Logs for Errors

1. Go to GitHub → Actions → Latest workflow run
2. Expand the "build_and_deploy" job
3. Check each step:
   - ✅ "Set up job" - Should be green
   - ✅ "Run actions/checkout@v4" - Should be green
   - ✅ "Run npm ci && npm run build" - **Check this for build errors**
   - ✅ "Deploy to Firebase Hosting" - **Check this for deployment errors**

### 5. Verify Environment Variables

Make sure all GitHub Secrets are set:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_WEATHER_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_MYHUB_D0F5A`

**To check**: GitHub repo → Settings → Secrets and variables → Actions

### 6. Manual Deployment (If Needed)

If automatic deployment isn't working, you can deploy manually:

```bash
# Make sure you're in the project directory
cd C:\Users\aspat\OneDrive\Desktop\Projects\DaliHub

# Install dependencies (if needed)
npm ci

# Build the project
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### 7. Force a New Deployment

If you want to trigger a new deployment without code changes:

1. Make a small change (like adding a comment)
2. Commit and push:
   ```bash
   git add .
   git commit -m "Trigger deployment"
   git push origin main
   ```

## Common Issues

### Issue: "Workflow succeeded but site not updated"
**Solution**: 
- Clear browser cache (Step 3)
- Check Firebase Hosting release timestamp (Step 2)
- Wait 2-3 minutes for CDN propagation

### Issue: "Build failed"
**Solution**:
- Check workflow logs for TypeScript/compilation errors
- Make sure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Issue: "Deployment failed"
**Solution**:
- Check Firebase service account secret is correct
- Verify Firebase project ID matches
- Check Firebase Hosting is enabled in your project

### Issue: "Changes not visible after deployment"
**Solution**:
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Try incognito/private mode
- Wait 1-2 minutes for CDN cache to clear

## Expected Timeline

- **Push to GitHub**: Immediate
- **GitHub Actions starts**: ~10-30 seconds
- **Build completes**: ~1-2 minutes
- **Firebase deploys**: ~30 seconds
- **Site updates globally**: 1-3 minutes (CDN propagation)

**Total time**: Usually 2-5 minutes from push to live site

## Verify Deployment Success

After deployment, check:
1. ✅ GitHub Actions shows green checkmark
2. ✅ Firebase Hosting shows new release with recent timestamp
3. ✅ Site URL shows latest changes (after cache clear)

If all three are ✅, your deployment worked!

