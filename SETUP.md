# MyHub Setup Guide

## Prerequisites

Before you begin, make sure you have:
- Node.js (v18 or higher) installed
- npm or pnpm package manager
- A Firebase account (free tier is sufficient)

## Step 1: Install Dependencies

Since PowerShell execution policy might be blocking npm commands, you have two options:

### Option A: Change PowerShell Execution Policy (Recommended)
Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then install dependencies:
```bash
npm install
```

### Option B: Use Command Prompt
Open Command Prompt (cmd) instead of PowerShell and run:
```bash
npm install
```

## Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (you can skip Google Analytics for now)
4. Once your project is created:
   - Click the web icon (`</>`) to add a web app
   - Register your app (name it "MyHub")
   - Copy the Firebase configuration object

5. Enable Authentication:
   - Go to "Authentication" in the left sidebar
   - Click "Get started"
   - Enable "Email/Password" sign-in method

6. Set up Firestore Database:
   - Go to "Firestore Database" in the left sidebar
   - Click "Create database"
   - Start in "Test mode" (we'll add security rules later)
   - Choose a location (select closest to Halifax, Canada)

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```

2. Open `.env` and paste your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 4: Set Up Firestore Security Rules

1. Go to Firestore Database > Rules
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Semesters
      match /semesters/{semesterId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Courses
        match /courses/{courseId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          
          // Assignments
          match /assignments/{assignmentId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
          
          // Recurring Templates
          match /recurringTemplates/{templateId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
  }
}
```

3. Click "Publish"

## Step 5: Run the Development Server

```bash
npm run dev
```

The app should open at `http://localhost:5173`

## Step 6: Create Your First Account

1. Click "Sign up" on the login page
2. Enter your name, email, and password
3. You'll be automatically logged in

## Step 7: Set Up Your First Semester

1. After logging in, you'll see "No Active Semester"
2. Click "Set Up Semester"
3. Fill in:
   - Semester name (e.g., "Winter 2026")
   - Start date
   - End date
4. Click "Next: Add Courses"
5. Add your courses:
   - Course code (e.g., "CSCI 3172")
   - Course name (e.g., "Web-Centric Computing")
   - Professor (optional)
   - Choose a color
6. Click "Finish Setup"

## Step 8: Start Using MyHub!

- **Dashboard**: View today's assignments and upcoming deadlines
- **Courses**: See all your courses and click to view details
- **Quick Add**: Use the "Quick Add" button to add assignments in seconds
- **Settings**: Customize your preferences

## Troubleshooting

### "Cannot find module" errors
Run `npm install` again to ensure all dependencies are installed.

### Firebase connection errors
- Double-check your `.env` file has the correct values
- Make sure you've enabled Email/Password authentication in Firebase
- Verify Firestore is set up and rules are published

### Port already in use
If port 5173 is taken, Vite will automatically use the next available port. Check the terminal output for the actual URL.

### Dark mode not working
- Go to Settings and toggle the theme
- The preference is saved to your Firebase account

## Next Steps

Once everything is working:
1. Add your courses and assignments
2. Test the quick-add feature (should take < 30 seconds)
3. Try accessing from your phone (install as PWA)
4. Customize settings to your preferences

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Firebase Console for any errors
3. Make sure all environment variables are set correctly
4. Verify Firestore security rules are published

