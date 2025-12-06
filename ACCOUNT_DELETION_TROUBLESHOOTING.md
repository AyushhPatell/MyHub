# Account Deletion Troubleshooting

## If Account Deletion Still Fails After Updating Rules

### Step 1: Verify Rules Are Published
1. Go to Firebase Console → Firestore Database → Rules
2. Make sure the rules include `delete` permission (should show `allow read, write, delete`)
3. Click "Publish" if you see any unsaved changes
4. Wait 1-2 minutes for rules to propagate

### Step 2: Clear Browser Cache
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Or clear browser cache and reload

### Step 3: Verify You're Logged In
- Make sure you're logged in as the user whose account you're trying to delete
- The user ID in the URL should match your Firebase Auth UID

### Step 4: Check Console for Specific Error
- Open browser DevTools → Console
- Look for the exact error message
- Common errors:
  - `permission-denied` → Rules not updated or not propagated
  - `unauthenticated` → User not logged in
  - `not-found` → User document doesn't exist

### Step 5: Test Rules Directly
If still failing, the issue might be with nested collection permissions. Try this alternative rule structure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow all operations on user document and all subcollections
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      
      // Explicitly allow all operations on all subcollections
      match /{document=**} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**Note:** The `{document=**}` pattern matches all subcollections recursively, which should handle nested deletes better.

### Step 6: Manual Verification
1. Go to Firebase Console → Firestore Database → Data
2. Navigate to `users/{your-user-id}`
3. Try manually deleting a document to test permissions
4. If manual delete works but code doesn't, it's likely a code issue

### Still Not Working?
- Make sure you're using the latest version of the code
- Check that `auth.currentUser` is not null before deletion
- Verify the user ID matches between Auth and Firestore

