# Email Integration Setup Guide

This guide will help you set up email notifications for DaliHub using Firebase Cloud Functions and an email service provider.

## Overview

The email integration consists of:
- **Frontend**: Email preferences UI in Settings (already implemented)
- **Backend**: Firebase Cloud Functions that send emails
- **Email Service**: Resend (recommended) or SendGrid/Mailgun

## Prerequisites

1. Firebase project with Firestore and Authentication enabled
2. Node.js 18+ installed
3. Firebase CLI installed (`npm install -g firebase-tools`)
4. An email service account (Resend recommended - free tier: 3,000 emails/month)

## Step 1: Initialize Firebase Functions

If you haven't already set up Firebase Functions:

```bash
# Login to Firebase
firebase login

# Initialize Functions in your project
firebase init functions

# Select:
# - TypeScript
# - ESLint (yes)
# - Install dependencies (yes)
```

## Step 2: Install Dependencies

Navigate to the `functions` directory and install required packages:

```bash
cd functions
npm install resend date-fns
npm install --save-dev @types/node
```

**Alternative**: If using SendGrid instead of Resend:
```bash
npm install @sendgrid/mail
```

## Step 3: Set Up Email Service Provider

### Option A: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add it to Firebase Functions environment:

```bash
firebase functions:config:set resend.api_key="your-resend-api-key"
```

### Option B: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Add it to Firebase Functions environment:

```bash
firebase functions:config:set sendgrid.api_key="your-sendgrid-api-key"
```

### Option C: Mailgun

1. Sign up at [mailgun.com](https://mailgun.com)
2. Get your API key and domain
3. Add to Firebase Functions environment:

```bash
firebase functions:config:set mailgun.api_key="your-mailgun-api-key"
firebase functions:config:set mailgun.domain="your-mailgun-domain"
```

## Step 4: Create Cloud Functions

Create the following files in your `functions/src` directory:

### `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { format, differenceInDays, startOfDay } from 'date-fns';

admin.initializeApp();

// Initialize Resend (or your email service)
const resend = new Resend(functions.config().resend.api_key);

// Email sender configuration
const FROM_EMAIL = 'noreply@yourdomain.com'; // Change to your verified domain
const FROM_NAME = 'DaliHub';

// Helper function to get user data
async function getUserData(userId: string) {
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  if (!userDoc.exists) throw new Error('User not found');
  return { id: userId, ...userDoc.data() };
}

// Helper function to get active semester
async function getActiveSemester(userId: string) {
  const semestersSnapshot = await admin.firestore()
    .collection(`users/${userId}/semesters`)
    .where('isActive', '==', true)
    .get();
  
  if (semestersSnapshot.empty) return null;
  return { id: semestersSnapshot.docs[0].id, ...semestersSnapshot.docs[0].data() };
}

// Helper function to get all assignments
async function getAllAssignments(userId: string, semesterId: string) {
  const coursesSnapshot = await admin.firestore()
    .collection(`users/${userId}/semesters/${semesterId}/courses`)
    .get();
  
  const assignments: any[] = [];
  
  for (const courseDoc of coursesSnapshot.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();
    
    const assignmentsSnapshot = await admin.firestore()
      .collection(`users/${userId}/semesters/${semesterId}/courses/${courseId}/assignments`)
      .get();
    
    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const assignment = assignmentDoc.data();
      if (!assignment.completedAt) {
        assignments.push({
          id: assignmentDoc.id,
          ...assignment,
          courseName: courseData.courseName,
          courseCode: courseData.courseCode,
          courseColor: courseData.color,
          dueDate: assignment.dueDate.toDate(),
        });
      }
    }
  }
  
  return assignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// Email template helper
function getEmailTemplate(title: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DaliHub</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          ${content}
        </div>
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
          <p>This email was sent from DaliHub. You can manage your email preferences in Settings.</p>
        </div>
      </body>
    </html>
  `;
}

// Assignment Reminder Email
export const sendAssignmentReminder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, assignmentId, reminderType } = data;
  
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    // Check if email notifications are enabled
    if (!preferences.emailNotificationsEnabled || !preferences.emailAssignmentReminders) {
      return { success: false, message: 'Email notifications disabled' };
    }

    const semester = await getActiveSemester(userId);
    if (!semester) {
      return { success: false, message: 'No active semester' };
    }

    // Get assignment
    const coursesSnapshot = await admin.firestore()
      .collection(`users/${userId}/semesters/${semester.id}/courses`)
      .get();
    
    let assignment: any = null;
    let courseData: any = null;
    
    for (const courseDoc of coursesSnapshot.docs) {
      const assignmentDoc = await admin.firestore()
        .doc(`users/${userId}/semesters/${semester.id}/courses/${courseDoc.id}/assignments/${assignmentId}`)
        .get();
      
      if (assignmentDoc.exists) {
        assignment = { id: assignmentDoc.id, ...assignmentDoc.data() };
        courseData = courseDoc.data();
        break;
      }
    }

    if (!assignment || assignment.completedAt) {
      return { success: false, message: 'Assignment not found or completed' };
    }

    const dueDate = assignment.dueDate.toDate();
    const dueDateStr = format(dueDate, 'MMMM d, yyyy');
    
    let subject = '';
    let message = '';
    
    switch (reminderType) {
      case 'due-today':
        subject = `📅 ${assignment.name} is due today!`;
        message = `<h2 style="color: #dc2626;">Assignment Due Today</h2>
          <p><strong>${assignment.name}</strong> for <strong>${courseData.courseName}</strong> is due today (${dueDateStr}).</p>
          <p>Make sure to submit it on time!</p>`;
        break;
      case 'due-1-day':
        subject = `⏰ ${assignment.name} is due tomorrow`;
        message = `<h2 style="color: #f59e0b;">Assignment Due Tomorrow</h2>
          <p><strong>${assignment.name}</strong> for <strong>${courseData.courseName}</strong> is due tomorrow (${dueDateStr}).</p>
          <p>Don't forget to complete it!</p>`;
        break;
      case 'due-3-days':
        subject = `📝 ${assignment.name} is due in 3 days`;
        message = `<h2 style="color: #3b82f6;">Upcoming Assignment</h2>
          <p><strong>${assignment.name}</strong> for <strong>${courseData.courseName}</strong> is due in 3 days (${dueDateStr}).</p>
          <p>Start working on it soon!</p>`;
        break;
      case 'overdue':
        subject = `⚠️ ${assignment.name} is overdue`;
        message = `<h2 style="color: #dc2626;">Overdue Assignment</h2>
          <p><strong>${assignment.name}</strong> for <strong>${courseData.courseName}</strong> was due on ${dueDateStr} and is now overdue.</p>
          <p>Please complete it as soon as possible!</p>`;
        break;
    }

    const emailContent = getEmailTemplate(subject, message);
    
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: user.email,
      subject: subject,
      html: emailContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending assignment reminder:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email', error.message);
  }
});

// Daily Digest Email
export const sendDailyDigest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;
  
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'daily') {
      return { success: false, message: 'Daily digest not enabled' };
    }

    const semester = await getActiveSemester(userId);
    if (!semester) {
      return { success: false, message: 'No active semester' };
    }

    const assignments = await getAllAssignments(userId, semester.id);
    const now = new Date();
    const today = startOfDay(now);
    
    const dueToday = assignments.filter(a => {
      const dueDate = startOfDay(a.dueDate);
      return dueDate.getTime() === today.getTime();
    });
    
    const dueThisWeek = assignments.filter(a => {
      const dueDate = startOfDay(a.dueDate);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil > 0 && daysUntil <= 7;
    });
    
    const overdue = assignments.filter(a => {
      const dueDate = startOfDay(a.dueDate);
      return dueDate.getTime() < today.getTime();
    });

    let content = `<h2 style="color: #667eea;">Your Daily Assignment Summary</h2>`;
    content += `<p>Here's what's coming up for <strong>${semester.name}</strong>:</p>`;
    
    if (dueToday.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Due Today (${dueToday.length})</h3><ul>`;
      dueToday.forEach(a => {
        content += `<li><strong>${a.name}</strong> - ${a.courseCode} (${format(a.dueDate, 'h:mm a')})</li>`;
      });
      content += `</ul>`;
    }
    
    if (overdue.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Overdue (${overdue.length})</h3><ul>`;
      overdue.forEach(a => {
        content += `<li><strong>${a.name}</strong> - ${a.courseCode}</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueThisWeek.length > 0) {
      content += `<h3 style="color: #3b82f6; margin-top: 20px;">Due This Week (${dueThisWeek.length})</h3><ul>`;
      dueThisWeek.forEach(a => {
        content += `<li><strong>${a.name}</strong> - ${a.courseCode} (${format(a.dueDate, 'MMM d, h:mm a')})</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueToday.length === 0 && overdue.length === 0 && dueThisWeek.length === 0) {
      content += `<p style="color: #10b981;">🎉 Great job! You have no assignments due soon.</p>`;
    }

    const emailContent = getEmailTemplate('Daily Assignment Digest', content);
    
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: user.email,
      subject: `📚 Daily Assignment Digest - ${format(now, 'MMMM d, yyyy')}`,
      html: emailContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending daily digest:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email', error.message);
  }
});

// Weekly Digest Email
export const sendWeeklyDigest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;
  
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'weekly') {
      return { success: false, message: 'Weekly digest not enabled' };
    }

    const semester = await getActiveSemester(userId);
    if (!semester) {
      return { success: false, message: 'No active semester' };
    }

    const assignments = await getAllAssignments(userId, semester.id);
    const now = new Date();
    const today = startOfDay(now);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const dueThisWeek = assignments.filter(a => {
      const dueDate = startOfDay(a.dueDate);
      return dueDate >= today && dueDate <= nextWeek;
    });
    
    const overdue = assignments.filter(a => {
      const dueDate = startOfDay(a.dueDate);
      return dueDate < today;
    });

    let content = `<h2 style="color: #667eea;">Your Weekly Assignment Summary</h2>`;
    content += `<p>Here's what's coming up for <strong>${semester.name}</strong> this week:</p>`;
    
    if (overdue.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Overdue (${overdue.length})</h3><ul>`;
      overdue.forEach(a => {
        content += `<li><strong>${a.name}</strong> - ${a.courseCode}</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueThisWeek.length > 0) {
      content += `<h3 style="color: #3b82f6; margin-top: 20px;">Due This Week (${dueThisWeek.length})</h3><ul>`;
      dueThisWeek.forEach(a => {
        content += `<li><strong>${a.name}</strong> - ${a.courseCode} (${format(a.dueDate, 'MMM d, h:mm a')})</li>`;
      });
      content += `</ul>`;
    }
    
    if (overdue.length === 0 && dueThisWeek.length === 0) {
      content += `<p style="color: #10b981;">🎉 Great job! You have no assignments due this week.</p>`;
    }

    const emailContent = getEmailTemplate('Weekly Assignment Digest', content);
    
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: user.email,
      subject: `📚 Weekly Assignment Digest - Week of ${format(now, 'MMMM d')}`,
      html: emailContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending weekly digest:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email', error.message);
  }
});

// Scheduled function for daily digests
export const scheduledDailyDigest = functions.pubsub
  .schedule('0 9 * * *') // 9 AM every day
  .timeZone('America/Halifax')
  .onRun(async (context) => {
    // Get all users with daily digest enabled
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const preferences = user.preferences || {};
      
      if (preferences.emailNotificationsEnabled && preferences.emailDigestFrequency === 'daily') {
        const digestTime = preferences.emailDigestTime || '09:00';
        const [hours, minutes] = digestTime.split(':').map(Number);
        const now = new Date();
        
        // Only send if it's the right time (within 1 hour window)
        if (now.getHours() === hours) {
          try {
            await sendDailyDigest({ userId: userDoc.id }, { auth: { uid: userDoc.id } } as any);
          } catch (error) {
            console.error(`Error sending daily digest to ${userDoc.id}:`, error);
          }
        }
      }
    }
  });

// Scheduled function for weekly digests
export const scheduledWeeklyDigest = functions.pubsub
  .schedule('0 9 * * 1') // 9 AM every Monday
  .timeZone('America/Halifax')
  .onRun(async (context) => {
    // Get all users with weekly digest enabled
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const preferences = user.preferences || {};
      
      if (preferences.emailNotificationsEnabled && preferences.emailDigestFrequency === 'weekly') {
        const digestDay = preferences.emailDigestDay || 'Monday';
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        
        // Only send if it's the right day
        if (currentDay === digestDay) {
          try {
            await sendWeeklyDigest({ userId: userDoc.id }, { auth: { uid: userDoc.id } } as any);
          } catch (error) {
            console.error(`Error sending weekly digest to ${userDoc.id}:`, error);
          }
        }
      }
    }
  });

// Test email function
export const sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;
  
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    const user = await getUserData(userId);
    
    const emailContent = getEmailTemplate(
      'Test Email from DaliHub',
      '<h2>Email Setup Successful!</h2><p>If you received this email, your email integration is working correctly.</p>'
    );
    
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: user.email,
      subject: '✅ DaliHub Email Test',
      html: emailContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending test email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email', error.message);
  }
});
```

## Step 5: Update Firestore Security Rules

Add rules to allow Cloud Functions to read user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow Cloud Functions to read user data
      allow read: if request.auth != null;
      
      // ... rest of your existing rules
    }
  }
}
```

## Step 6: Deploy Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## Step 7: Verify Domain (Resend)

1. Go to Resend dashboard > Domains
2. Add your domain
3. Verify DNS records
4. Update `FROM_EMAIL` in `functions/src/index.ts` to use your verified domain

## Step 8: Test Email Functionality

1. Open your app
2. Go to Settings > Email Notifications
3. Enable email notifications
4. Use the test email function (you can add a button in Settings to trigger it)

## Troubleshooting

### Functions not deploying
- Check Firebase CLI is logged in: `firebase login`
- Verify project: `firebase use <project-id>`
- Check function logs: `firebase functions:log`

### Emails not sending
- Verify API key is set: `firebase functions:config:get`
- Check function logs for errors
- Verify domain is verified (Resend)
- Check spam folder

### Permission errors
- Ensure Firestore rules allow authenticated reads
- Verify user authentication in function calls

## Cost Considerations

- **Resend**: Free tier: 3,000 emails/month, then $20/month for 50,000
- **SendGrid**: Free tier: 100 emails/day
- **Mailgun**: Free tier: 5,000 emails/month for 3 months
- **Firebase Functions**: Free tier: 2 million invocations/month

## Next Steps

1. Customize email templates to match your brand
2. Add more email types (course updates, etc.)
3. Implement email analytics
4. Add unsubscribe functionality

