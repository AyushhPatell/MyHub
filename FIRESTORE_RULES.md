# Firestore Security Rules for Account Deletion

## Current Issue
Account deletion is failing with "Missing or insufficient permissions" error. This is because the security rules need to explicitly allow delete operations on all nested collections.

## Updated Security Rules

Copy and paste these rules into your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';

service cloud.firestore {
    match /databases/{database}/documents {

    // Users can only access their own data
    match /users/{userId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;

        // Semesters
        match /semesters/{semesterId} {
            allow read, write, delete: if request.auth != null && request.auth.uid == userId;

            // Courses
            match /courses/{courseId} {
                allow read, write, delete: if request.auth != null && request.auth.uid == userId;

                // Assignments
                match /assignments/{assignmentId} {
                    allow read, write, delete: if request.auth != null && request.auth.uid == userId;
                }

                // Recurring Templates
                match /recurringTemplates/{templateId} {
                    allow read, write, delete: if request.auth != null && request.auth.uid == userId;
                }
            }

            // Schedule Blocks
            match /scheduleBlocks/{blockId} {
                allow read, write, delete: if request.auth != null && request.auth.uid == userId;
            }
        }

        // Notifications
        match /notifications/{notificationId} {
            allow read, write, delete: if request.auth != null && request.auth.uid == userId;
        }

        // Dashboard Layout
        match /dashboard/{document=**} {
            allow read, write, delete: if request.auth != null && request.auth.uid == userId;
        }

        // Quick Notes
        match /quickNotes/{noteId} {
            allow read, write, delete: if request.auth != null && request.auth.uid == userId;
        }

        // Wildcard rule for all nested subcollections - helps with account deletion
        // This ensures all nested collections can be deleted
        match /{allSubcollections=**} {
            allow read, write, delete: if request.auth != null && request.auth.uid == userId;
        }
    }
}
}

```

## Key Changes
1. **Added explicit `delete` permission** alongside `read` and `write` for all collections
2. **Maintained user authentication checks** - only the owner can delete their data
3. **Applied to all nested collections** - semesters, courses, assignments, templates, notifications, dashboard, and quick notes

## How to Update
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the existing rules with the rules above
5. Click **Publish**

## Testing
After updating the rules, try deleting an account again. The deletion should now work properly.

