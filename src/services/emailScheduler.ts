/**
 * Email Scheduler Service
 * 
 * This service handles scheduled email notifications (daily digest, weekly digest, assignment reminders).
 * Since this is a frontend-only app, it checks periodically when the app is open.
 * 
 * Note: For emails to be sent reliably at exact times, the app needs to be open.
 * For a production app, consider using a backend service or Firebase Cloud Functions.
 */

import { sendDailyDigest, sendWeeklyDigest, sendAssignmentReminder } from './emailFunctions';
import { semesterService, assignmentService } from './firestore';
import { startOfDay, differenceInDays, differenceInHours, differenceInMinutes, format } from 'date-fns';

interface EmailCheckResult {
  sent: boolean;
  type: 'daily-digest' | 'weekly-digest' | 'assignment-reminder' | null;
}

/**
 * Check if it's time to send daily digest
 */
function shouldSendDailyDigest(
  preferences: any,
  lastSentKey: string
): boolean {
  if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'daily') {
    return false;
  }

  const digestTime = preferences.emailDigestTime || '09:00';
  const [hours, minutes] = digestTime.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // Check if current time is past scheduled time today
  const isPastScheduledTime = now >= scheduledTime;
  
  // Check if we already sent today
  const lastSent = localStorage.getItem(lastSentKey);
  const today = format(now, 'yyyy-MM-dd');
  
  if (lastSent === today) {
    return false; // Already sent today
  }

  return isPastScheduledTime;
}

/**
 * Check if it's time to send weekly digest
 */
function shouldSendWeeklyDigest(
  preferences: any,
  lastSentKey: string
): boolean {
  if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'weekly') {
    return false;
  }

  const digestDay = preferences.emailDigestDay || 'Monday';
  const digestTime = preferences.emailDigestTime || '09:00';
  const [hours, minutes] = digestTime.split(':').map(Number);
  
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getDay()];
  
  // Check if today is the scheduled day
  if (currentDay !== digestDay) {
    return false;
  }

  // Check if current time is past scheduled time
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);
  const isPastScheduledTime = now >= scheduledTime;
  
  // Check if we already sent this week
  const lastSent = localStorage.getItem(lastSentKey);
  const weekStart = format(now, 'yyyy-MM-dd');
  
  if (lastSent === weekStart) {
    return false; // Already sent this week
  }

  return isPastScheduledTime;
}

/**
 * Check and send assignment reminders
 */
async function checkAssignmentReminders(userId: string, preferences: any): Promise<void> {
  if (!preferences.emailNotificationsEnabled || !preferences.emailAssignmentReminders) {
    return;
  }

  try {
    const semester = await semesterService.getActiveSemester(userId);
    if (!semester) return;

    const assignments = await assignmentService.getAllAssignments(userId, semester.id);
    const now = new Date();
    const today = startOfDay(now);

    for (const assignment of assignments) {
      if (assignment.completedAt) continue;

      // Handle Firestore Timestamp or Date
      const dueDate = (assignment.dueDate as any)?.toDate
        ? (assignment.dueDate as any).toDate()
        : new Date(assignment.dueDate as Date | string);
      const dueDateStart = startOfDay(dueDate);
      const daysUntilDue = differenceInDays(dueDateStart, today);
      const hoursUntilDue = differenceInHours(dueDate, now);
      const minutesUntilDue = differenceInMinutes(dueDate, now);

      // Reminders: Due in 3 days, Due in 1 day, Due in 3 hours (no overdue or due-today)
      const reminderKey = `assignment-reminder-${assignment.id}`;
      const lastReminder = localStorage.getItem(reminderKey);

      if (daysUntilDue === 3 && lastReminder !== 'due-3-days') {
        await sendAssignmentReminder(userId, assignment.id, 'due-3-days');
        localStorage.setItem(reminderKey, 'due-3-days');
      } else if (
        hoursUntilDue >= 20 &&
        hoursUntilDue <= 28 &&
        lastReminder !== 'due-1-day'
      ) {
        // Due in ~1 day (20–28 hours before)
        await sendAssignmentReminder(userId, assignment.id, 'due-1-day');
        localStorage.setItem(reminderKey, 'due-1-day');
      } else if (
        minutesUntilDue >= 150 &&
        minutesUntilDue <= 210 &&
        lastReminder !== 'due-3-hours'
      ) {
        // Due in ~3 hours (2.5–3.5 hour window)
        await sendAssignmentReminder(userId, assignment.id, 'due-3-hours');
        localStorage.setItem(reminderKey, 'due-3-hours');
      }
    }
  } catch (error) {
    console.error('Error checking assignment reminders:', error);
  }
}

/**
 * Check and send scheduled emails
 * This should be called periodically (e.g., every minute) when the app is open
 */
export async function checkScheduledEmails(
  userId: string,
  preferences: any
): Promise<EmailCheckResult> {
  try {
    // Check daily digest
    const dailyKey = `daily-digest-sent-${userId}`;
    if (shouldSendDailyDigest(preferences, dailyKey)) {
      await sendDailyDigest(userId);
      localStorage.setItem(dailyKey, format(new Date(), 'yyyy-MM-dd'));
      return { sent: true, type: 'daily-digest' };
    }

    // Check weekly digest
    const weeklyKey = `weekly-digest-sent-${userId}`;
    if (shouldSendWeeklyDigest(preferences, weeklyKey)) {
      await sendWeeklyDigest(userId);
      localStorage.setItem(weeklyKey, format(new Date(), 'yyyy-MM-dd'));
      return { sent: true, type: 'weekly-digest' };
    }

    // Check assignment reminders
    await checkAssignmentReminders(userId, preferences);

    return { sent: false, type: null };
  } catch (error) {
    console.error('Error checking scheduled emails:', error);
    return { sent: false, type: null };
  }
}

/**
 * Start the email scheduler
 * Checks every minute if emails should be sent
 */
export function startEmailScheduler(
  userId: string,
  preferences: any,
  onEmailSent?: (result: EmailCheckResult) => void
): () => void {
  // Check immediately
  checkScheduledEmails(userId, preferences).then((result) => {
    if (result.sent && onEmailSent) {
      onEmailSent(result);
    }
  });

  // Then check every minute
  const interval = setInterval(() => {
    checkScheduledEmails(userId, preferences).then((result) => {
      if (result.sent && onEmailSent) {
        onEmailSent(result);
      }
    });
  }, 60000); // Check every minute

  // Return cleanup function
  return () => clearInterval(interval);
}

