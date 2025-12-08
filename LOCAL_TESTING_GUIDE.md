# Local Testing Guide

This guide will help you test your web app locally before pushing changes to GitHub.

## Quick Start

### 1. Install Dependencies (if needed)
If you haven't installed dependencies or they're outdated:
```bash
npm install
```

**Note:** If `npm ci` fails with permission errors (Windows), use `npm install` instead.

### 2. Start Development Server
Run the local development server:
```bash
npm run dev
```

This will:
- Start Vite dev server (usually at `http://localhost:5173`)
- Open your browser automatically (or check the terminal for the URL)
- Enable hot module replacement (changes reflect immediately)
- Show TypeScript errors in the terminal and browser console

### 3. Test Your Changes
- Open the app in your browser
- Test all the features you've changed
- Check the browser console (F12) for any errors
- Test on different screen sizes (mobile, tablet, desktop) using browser dev tools

## Pre-Push Checklist

Before pushing to GitHub, follow these steps:

### Step 1: Test Development Build
```bash
npm run dev
```
- ✅ App loads without errors
- ✅ All features work as expected
- ✅ No console errors
- ✅ Responsive design works on mobile/tablet/desktop

### Step 2: Test Production Build Locally
This catches build errors that might break GitHub Actions:

```bash
npm run build
```

**What to check:**
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ No unused variable warnings

If the build fails, fix the errors before pushing.

### Step 3: Preview Production Build (Optional)
After a successful build, preview the production version:

```bash
npm run preview
```

This serves the production build at `http://localhost:4173` so you can test how it will look when deployed.

### Step 4: Check for Linting Issues (Optional)
```bash
npm run lint
```

This checks for code quality issues. Fix any critical errors before pushing.

## Common Issues & Solutions

### Issue: `npm ci` fails with permission error
**Solution:** Use `npm install` instead, or:
- Close any editors/processes using the files
- Run PowerShell/CMD as Administrator
- Check if antivirus is blocking file access

### Issue: Port already in use
**Solution:** 
- Close other instances of the dev server
- Or specify a different port: `npm run dev -- --port 3000`

### Issue: Build fails with TypeScript errors
**Solution:**
- Check the error message in terminal
- Fix the TypeScript errors
- Common issues: unused imports, type mismatches, missing types

### Issue: Changes not reflecting
**Solution:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Restart dev server

## Recommended Workflow

1. **Make your changes** in the code
2. **Run `npm run dev`** and test in browser
3. **Fix any runtime errors** you see
4. **Run `npm run build`** to catch build errors
5. **Fix any build errors** before pushing
6. **Commit and push** to GitHub
7. **Monitor GitHub Actions** to ensure deployment succeeds

## Testing Checklist

Before pushing, verify:

- [ ] App runs locally with `npm run dev`
- [ ] All new features work correctly
- [ ] No console errors in browser
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Production build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No unused imports/variables
- [ ] All modals/dropdowns work correctly
- [ ] Navigation works on all pages
- [ ] Forms submit correctly
- [ ] Firebase operations work (auth, database)

## Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality

# Installation
npm install          # Install/update dependencies
npm ci               # Clean install (use if npm install fails)
```

## Browser DevTools Tips

- **F12** - Open DevTools
- **Ctrl+Shift+M** (Cmd+Option+M on Mac) - Toggle device toolbar for mobile testing
- **Console tab** - Check for JavaScript errors
- **Network tab** - Check API calls and Firebase requests
- **Application tab** - Check localStorage, service workers, etc.

## Testing Mobile View

1. Open DevTools (F12)
2. Click the device toolbar icon (or Ctrl+Shift+M)
3. Select a device preset (iPhone, iPad, etc.)
4. Test your app's responsive design
5. Check touch interactions work correctly

---

**Remember:** Always test locally before pushing to avoid breaking the production deployment!

