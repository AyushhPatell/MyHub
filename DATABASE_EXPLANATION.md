# Database Structure & How Data Flows

## Overview

MyHub uses **Firebase Firestore** (a NoSQL database) to store all your data. Here's how it works:

## Database Structure

Your data is organized in a hierarchical structure:

```
users/
  └── {your-user-id}/
      ├── preferences (stored directly)
      └── semesters/
          └── {semester-id}/
              ├── semester info (name, dates, isActive)
              └── courses/
                  └── {course-id}/
                      ├── course info (code, name, professor, color)
                      └── assignments/
                          └── {assignment-id}/
                              └── assignment info (name, dueDate, type, etc.)
```

## How Data is Saved

### 1. **When You Create an Account**
- Your user document is created at: `users/{your-user-id}`
- Contains: email, name, preferences (theme, timezone, etc.)

### 2. **When You Set Up a Semester**
- Semester document is created at: `users/{your-user-id}/semesters/{semester-id}`
- Contains: name (e.g., "Fall 2026"), startDate, endDate, isActive: true
- **All other semesters are automatically set to isActive: false**

### 3. **When You Add Courses**
- Course documents are created at: `users/{your-user-id}/semesters/{semester-id}/courses/{course-id}`
- Each course contains: courseCode, courseName, professor, color, schedule
- **Multiple courses can be added to one semester**

### 4. **When You Add Assignments**
- Assignment documents are created at: `users/{your-user-id}/semesters/{semester-id}/courses/{course-id}/assignments/{assignment-id}`
- Each assignment contains: name, dueDate, type, gradeWeight, links, etc.

## How Data is Retrieved

### Dashboard Page
1. Gets your active semester: `users/{your-user-id}/semesters` where `isActive == true`
2. Gets all courses in that semester
3. Gets all assignments from all courses
4. Displays them sorted by due date

### Courses Page
1. Gets your active semester
2. Gets all courses in that semester
3. Displays them as cards

### Course Detail Page
1. Gets the specific course
2. Gets all assignments for that course
3. Displays them with filters (upcoming/completed/all)

## Security

**Your data is private!** The Firestore security rules ensure:
- Only YOU can read/write your own data
- No one else can access your semesters, courses, or assignments
- All operations require authentication

## Real-Time Sync

Firebase automatically syncs your data:
- Changes on your laptop appear instantly on your phone
- Changes on your phone appear instantly on your laptop
- Works offline and syncs when you're back online

## What Was Fixed

1. **Removed Firebase Index Requirements**: Queries now sort data in memory instead of requiring database indexes
2. **Better Error Handling**: Added try-catch blocks and detailed error messages
3. **Data Validation**: Added checks to ensure required fields are filled before saving
4. **Console Logging**: Added logs to help debug if something goes wrong

## Testing the Flow

1. **Create Account** → Check Firebase Console → `users` collection → Your user document
2. **Set Up Semester** → Check `users/{your-id}/semesters` → New semester document
3. **Add Courses** → Check `users/{your-id}/semesters/{semester-id}/courses` → Course documents
4. **Add Assignment** → Check `users/{your-id}/semesters/{semester-id}/courses/{course-id}/assignments` → Assignment document

## Troubleshooting

If data isn't saving:
1. Check browser console for errors
2. Check Firebase Console → Firestore Database → Data tab
3. Verify you're logged in (check top right of app)
4. Check network tab to see if requests are being sent

If you see "Index required" errors:
- These should be fixed now, but if they appear, the app will still work (just slower)
- You can create the indexes by clicking the links in the error messages

