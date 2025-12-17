# Deployment Guide - EmailJS Environment Variables

## Problem
EmailJS works locally but not on the deployed website because environment variables are not available in production.

## Solution
For Vite applications, environment variables are **embedded at build time**. You need to ensure your environment variables are set when you build the project.

---

## Option 1: Build Locally and Deploy (Recommended - Free)

This is the simplest and free approach:

### Step 1: Set Up Environment Variables Locally

1. Make sure your `.env` file in the project root contains:
```env
VITE_EMAILJS_SERVICE_ID=your-service-id
VITE_EMAILJS_TEMPLATE_ID=your-template-id
VITE_EMAILJS_PUBLIC_KEY=your-public-key
```

2. **Important:** Never commit your `.env` file to Git (it should already be in `.gitignore`)

### Step 2: Build the Project

Run the build command locally:
```bash
npm run build
```

This will create a `dist` folder with your production build that includes the environment variables.

### Step 3: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

The environment variables are now baked into your build and will work in production!

---

## Option 2: Use GitHub Actions (CI/CD - Free)

If you want to build automatically on push, you can use GitHub Actions:

### Step 1: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - `VITE_EMAILJS_SERVICE_ID` = your service ID
   - `VITE_EMAILJS_TEMPLATE_ID` = your template ID
   - `VITE_EMAILJS_PUBLIC_KEY` = your public key

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_EMAILJS_SERVICE_ID: ${{ secrets.VITE_EMAILJS_SERVICE_ID }}
          VITE_EMAILJS_TEMPLATE_ID: ${{ secrets.VITE_EMAILJS_TEMPLATE_ID }}
          VITE_EMAILJS_PUBLIC_KEY: ${{ secrets.VITE_EMAILJS_PUBLIC_KEY }}
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-firebase-project-id
```

### Step 3: Get Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Copy the JSON content
4. Add it as a GitHub secret named `FIREBASE_SERVICE_ACCOUNT`

---

## Option 3: Use Firebase Hosting with Build Script

You can also create a build script that reads from a config file:

### Step 1: Create `build-config.js`

```javascript
// This file should NOT be committed to Git
// Add it to .gitignore
const fs = require('fs');
const path = require('path');

const envContent = `
VITE_EMAILJS_SERVICE_ID=${process.env.EMAILJS_SERVICE_ID || ''}
VITE_EMAILJS_TEMPLATE_ID=${process.env.EMAILJS_TEMPLATE_ID || ''}
VITE_EMAILJS_PUBLIC_KEY=${process.env.EMAILJS_PUBLIC_KEY || ''}
`;

fs.writeFileSync(path.join(__dirname, '.env.production'), envContent);
```

### Step 2: Update `package.json`

```json
{
  "scripts": {
    "build": "node build-config.js && tsc && vite build"
  }
}
```

---

## Verification

After deploying, test the email functionality:

1. Go to your deployed website
2. Navigate to Settings → Email Notifications
3. Click "Send a test email"
4. Check your inbox (and spam folder)

If it works, you'll see a success toast notification!

---

## Troubleshooting

### Issue: "Email service not configured" error

**Solution:** Make sure:
1. Your `.env` file has all three variables set
2. You rebuilt the project after adding/changing variables
3. You deployed the new build

### Issue: Environment variables are empty in production

**Solution:** 
- For Vite, environment variables must start with `VITE_`
- They must be set **before** running `npm run build`
- The build process embeds them into the JavaScript bundle

### Issue: Build works locally but not in CI/CD

**Solution:**
- Make sure secrets are set correctly in your CI/CD platform
- Check that the environment variables are available during the build step
- Verify the variable names match exactly (case-sensitive)

---

## Security Notes

⚠️ **Important:** 
- Environment variables starting with `VITE_` are **public** and will be visible in the client-side JavaScript bundle
- This is fine for EmailJS Public Key (it's meant to be public)
- Never put sensitive secrets (like API keys that should be private) in `VITE_` variables
- EmailJS Public Key is designed to be public, so this is safe

---

## Quick Checklist

- [ ] `.env` file exists with all three EmailJS variables
- [ ] Variables start with `VITE_` prefix
- [ ] Built the project with `npm run build`
- [ ] Deployed the `dist` folder to Firebase Hosting
- [ ] Tested email functionality on deployed site

---

## Need Help?

If you're still having issues:
1. Check the browser console for error messages
2. Verify your EmailJS template is set up correctly (see `EMAIL_SETUP_FREE.md`)
3. Make sure you're using the correct Service ID, Template ID, and Public Key from your EmailJS dashboard

