/**
 * Email Service using Firebase Functions
 * 
 * This service sends emails via Firebase Cloud Functions (backend).
 * Emails are sent even when the app is not running!
 * 
 * Setup:
 * 1. Configure SMTP secrets in Firebase Functions
 * 2. Deploy functions: firebase deploy --only functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface EmailResponse {
  success: boolean;
  message?: string;
}

/**
 * Check if email service is configured
 * (Always true if functions are deployed)
 */
export function isEmailConfigured(): boolean {
  return true; // Functions are always available if deployed
}

/**
 * Send assignment reminder email
 */
export async function sendAssignmentReminder(
  _userId: string,
  assignmentId: string,
  reminderType: 'due-1-day' | 'due-3-days' | 'due-3-hours'
): Promise<void> {
  try {
    const sendReminder = httpsCallable<{
      assignmentId: string;
      reminderType: string;
    }, EmailResponse>(functions, 'sendAssignmentReminderEmail');
    
    const result = await sendReminder({
      assignmentId,
      reminderType,
    });
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to send reminder');
    }
  } catch (error: any) {
    console.error('Error sending assignment reminder:', error);
    throw new Error(error.message || 'Failed to send reminder email');
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(_userId: string): Promise<void> {
  try {
    const sendDigest = httpsCallable<{}, EmailResponse>(
      functions,
      'sendDailyDigestEmail'
    );
    
    const result = await sendDigest({});
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to send digest');
    }
  } catch (error: any) {
    console.error('Error sending daily digest:', error);
    throw new Error(error.message || 'Failed to send daily digest');
  }
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigest(_userId: string): Promise<void> {
  try {
    const sendDigest = httpsCallable<{}, EmailResponse>(
      functions,
      'sendWeeklyDigestEmail'
    );
    
    const result = await sendDigest({});
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to send digest');
    }
  } catch (error: any) {
    console.error('Error sending weekly digest:', error);
    throw new Error(error.message || 'Failed to send weekly digest');
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(_userId: string): Promise<void> {
  try {
    const sendTest = httpsCallable<{}, EmailResponse>(
      functions,
      'sendTestEmail'
    );
    
    const result = await sendTest({});
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to send test email');
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    throw new Error(error.message || 'Failed to send test email');
  }
}

