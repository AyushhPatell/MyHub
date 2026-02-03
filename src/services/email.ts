/**
 * Email Service using EmailJS
 * 
 * This service sends emails directly from the frontend using EmailJS.
 * No backend or Firebase Functions required!
 * 
 * Free tier: 200 emails/month
 * Setup: https://www.emailjs.com/
 */

import emailjs from '@emailjs/browser';

// EmailJS configuration - Get these from your EmailJS dashboard
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Debug: Log environment variables (only in development)
if (import.meta.env.DEV) {
  console.log('EmailJS Config Check:', {
    hasServiceId: !!EMAILJS_SERVICE_ID,
    hasTemplateId: !!EMAILJS_TEMPLATE_ID,
    hasPublicKey: !!EMAILJS_PUBLIC_KEY,
    serviceId: EMAILJS_SERVICE_ID ? `${EMAILJS_SERVICE_ID.substring(0, 10)}...` : 'MISSING',
    templateId: EMAILJS_TEMPLATE_ID ? `${EMAILJS_TEMPLATE_ID.substring(0, 10)}...` : 'MISSING',
    publicKey: EMAILJS_PUBLIC_KEY ? `${EMAILJS_PUBLIC_KEY.substring(0, 10)}...` : 'MISSING',
  });
}

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

/**
 * Get user data for email templates
 */
async function getUserData(userId: string): Promise<{ id: string; email: string; name: string; preferences?: any }> {
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('../config/firebase');
  
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  const data = userDoc.data();
  return { 
    id: userId, 
    email: data.email || '',
    name: data.name || 'User',
    preferences: data.preferences || {}
  };
}

/**
 * Get active semester and assignments
 */
async function getAssignmentData(userId: string, assignmentId: string): Promise<{
  assignment: { id: string; name: string; dueDate: any; completedAt?: any };
  course: { courseName: string; courseCode: string };
  semester: { id: string; name: string };
}> {
  const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('../config/firebase');
  const { semesterService } = await import('./firestore');
  
  const semester = await semesterService.getActiveSemester(userId);
  if (!semester) {
    throw new Error('No active semester');
  }

  // Find the assignment
  const coursesSnapshot = await getDocs(
    collection(db, 'users', userId, 'semesters', semester.id, 'courses')
  );
  
  for (const courseDoc of coursesSnapshot.docs) {
    const assignmentDoc = await getDoc(
      doc(db, 'users', userId, 'semesters', semester.id, 'courses', courseDoc.id, 'assignments', assignmentId)
    );
    
    if (assignmentDoc.exists()) {
      const assignmentData = assignmentDoc.data();
      const courseData = courseDoc.data();
      return { 
        assignment: { 
          id: assignmentDoc.id, 
          name: assignmentData.name || '',
          dueDate: assignmentData.dueDate,
          completedAt: assignmentData.completedAt
        },
        course: {
          courseName: courseData.courseName || 'Unknown Course',
          courseCode: courseData.courseCode || ''
        },
        semester: {
          id: semester.id,
          name: semester.name
        }
      };
    }
  }
  
  throw new Error('Assignment not found');
}

/**
 * Get all assignments for digest emails
 */
async function getAllAssignmentsForDigest(userId: string): Promise<{
  dueToday: Array<{ name: string; dueDate: any; courseName?: string }>;
  dueThisWeek: Array<{ name: string; dueDate: any; courseName?: string }>;
  overdue: Array<{ name: string; dueDate: any; courseName?: string }>;
  semester: { id: string; name: string };
}> {
  const { assignmentService, semesterService, courseService } = await import('./firestore');
  const { differenceInDays, startOfDay } = await import('date-fns');
  
  const semester = await semesterService.getActiveSemester(userId);
  if (!semester) {
    throw new Error('No active semester');
  }

  const assignments = await assignmentService.getAllAssignments(userId, semester.id);
  const courses = await courseService.getCourses(userId, semester.id);
  const courseMap = new Map(courses.map(c => [c.id, c]));
  
  const now = new Date();
  const today = startOfDay(now);
  
  const dueToday = assignments.filter(a => {
    if (a.completedAt) return false;
    const dueDate = startOfDay(a.dueDate);
    return dueDate.getTime() === today.getTime();
  }).map(a => ({
    name: a.name,
    dueDate: a.dueDate,
    courseName: courseMap.get(a.courseId)?.courseName
  }));
  
  const dueThisWeek = assignments.filter(a => {
    if (a.completedAt) return false;
    const dueDate = startOfDay(a.dueDate);
    const daysUntil = differenceInDays(dueDate, today);
    return daysUntil > 0 && daysUntil <= 7;
  }).map(a => ({
    name: a.name,
    dueDate: a.dueDate,
    courseName: courseMap.get(a.courseId)?.courseName
  }));
  
  const overdue = assignments.filter(a => {
    if (a.completedAt) return false;
    const dueDate = startOfDay(a.dueDate);
    return dueDate.getTime() < today.getTime();
  }).map(a => ({
    name: a.name,
    dueDate: a.dueDate,
    courseName: courseMap.get(a.courseId)?.courseName
  }));

  return { dueToday, dueThisWeek, overdue, semester: { id: semester.id, name: semester.name } };
}

/**
 * Send email using EmailJS
 */
async function sendEmail(templateParams: Record<string, any>): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured. Please set up EmailJS (see EMAIL_SETUP_FREE.md)');
  }

  try {
    // Debug: Log what we're sending (only in dev)
    if (import.meta.env.DEV) {
      console.log('EmailJS Send Attempt:', {
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID,
        hasPublicKey: !!EMAILJS_PUBLIC_KEY,
        templateParams: Object.keys(templateParams),
      });
    }

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY // Pass public key explicitly
    );
    if (import.meta.env.DEV) {
      console.log('EmailJS success:', result);
    }
  } catch (error: any) {
    console.error('EmailJS error details:', error);
    // Extract more detailed error message
    const errorMessage = error?.text || error?.message || 'Unknown error';
    const errorStatus = error?.status || 'Unknown status';
    
    // More helpful error message
    let helpfulMessage = `EmailJS error (${errorStatus}): ${errorMessage}`;
    if (errorStatus === 400) {
      if (errorMessage.includes('service ID')) {
        helpfulMessage += `\n\nService ID being used: ${EMAILJS_SERVICE_ID}\nPlease verify this matches your EmailJS dashboard exactly.`;
      } else if (errorMessage.includes('template')) {
        helpfulMessage += `\n\nTemplate ID being used: ${EMAILJS_TEMPLATE_ID}\nPlease verify this matches your EmailJS dashboard exactly.`;
      }
    }
    
    throw new Error(helpfulMessage);
  }
}

/**
 * Trigger an assignment reminder email
 */
export async function sendAssignmentReminder(
  userId: string,
  assignmentId: string,
  reminderType: 'due-1-day' | 'due-3-days' | 'due-3-hours'
): Promise<void> {
  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    // Check if email notifications are enabled
    if (!preferences.emailNotificationsEnabled || !preferences.emailAssignmentReminders) {
      return;
    }

    const { assignment, course } = await getAssignmentData(userId, assignmentId);
    
    if (assignment.completedAt) {
      return; // Don't send for completed assignments
    }

    const dueDate = assignment.dueDate?.toDate ? assignment.dueDate.toDate() : new Date(assignment.dueDate);
    const { format } = await import('date-fns');
    const dueDateStr = format(dueDate, 'MMMM d, yyyy');
    const dueDateTimeStr = format(dueDate, 'MMMM d, yyyy \'at\' h:mm a');
    
    let subject = '';
    let message = '';
    
    switch (reminderType) {
      case 'due-1-day':
        subject = `⏰ ${assignment.name} is due tomorrow`;
        message = `<h2 style="color: #f59e0b;">Assignment Due Tomorrow</h2>
          <p><strong>${assignment.name}</strong> for <strong>${course.courseName}</strong> is due tomorrow (${dueDateStr}).</p>
          <p>Don't forget to complete it!</p>`;
        break;
      case 'due-3-days':
        subject = `📝 ${assignment.name} is due in 3 days`;
        message = `<h2 style="color: #3b82f6;">Upcoming Assignment</h2>
          <p><strong>${assignment.name}</strong> for <strong>${course.courseName}</strong> is due in 3 days (${dueDateStr}).</p>
          <p>Start working on it soon!</p>`;
        break;
      case 'due-3-hours':
        subject = `🔔 ${assignment.name} is due in 3 hours`;
        message = `<h2 style="color: #dc2626;">Deadline in 3 Hours</h2>
          <p><strong>${assignment.name}</strong> for <strong>${course.courseName}</strong> is due at <strong>${dueDateTimeStr}</strong>.</p>
          <p>Make sure to submit it on time!</p>`;
        break;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MyHub</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            ${message}
          </div>
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
            <p>This email was sent from MyHub. You can manage your email preferences in Settings.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to_email: user.email,
      to_name: user.name || 'User',
      subject: subject,
      message: emailHtml,
    });
  } catch (error) {
    console.error('Error sending assignment reminder email:', error);
    // Don't throw - email failures shouldn't break the app
  }
}

/**
 * Trigger a daily digest email
 */
export async function sendDailyDigest(userId: string): Promise<void> {
  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'daily') {
      return;
    }

    const { dueToday, dueThisWeek, overdue, semester } = await getAllAssignmentsForDigest(userId);
    const { format } = await import('date-fns');
    const now = new Date();
    
    let content = `<h2 style="color: #667eea;">Your Daily Assignment Summary</h2>`;
    content += `<p>Here's what's coming up for <strong>${semester.name}</strong>:</p>`;
    
    if (dueToday.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Due Today (${dueToday.length})</h3><ul>`;
      dueToday.forEach((a) => {
        const course = a.courseName || 'Unknown Course';
        const dueDate = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        const dueTime = format(dueDate, 'h:mm a');
        content += `<li><strong>${a.name}</strong> - ${course} (${dueTime})</li>`;
      });
      content += `</ul>`;
    }
    
    if (overdue.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Overdue (${overdue.length})</h3><ul>`;
      overdue.forEach((a: any) => {
        const course = a.courseName || 'Unknown Course';
        content += `<li><strong>${a.name}</strong> - ${course}</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueThisWeek.length > 0) {
      content += `<h3 style="color: #3b82f6; margin-top: 20px;">Due This Week (${dueThisWeek.length})</h3><ul>`;
      dueThisWeek.forEach((a: any) => {
        const course = a.courseName || 'Unknown Course';
        const dueDate = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        content += `<li><strong>${a.name}</strong> - ${course} (${format(dueDate, 'MMM d, h:mm a')})</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueToday.length === 0 && overdue.length === 0 && dueThisWeek.length === 0) {
      content += `<p style="color: #10b981;">🎉 Great job! You have no assignments due soon.</p>`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Assignment Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MyHub</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            ${content}
          </div>
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
            <p>This email was sent from MyHub. You can manage your email preferences in Settings.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to_email: user.email,
      to_name: user.name || 'User',
      subject: `📚 Daily Assignment Digest - ${format(now, 'MMMM d, yyyy')}`,
      message: emailHtml,
    });
  } catch (error) {
    console.error('Error sending daily digest email:', error);
  }
}

/**
 * Trigger a weekly digest email
 */
export async function sendWeeklyDigest(userId: string): Promise<void> {
  try {
    const user = await getUserData(userId);
    const preferences = user.preferences || {};
    
    if (!preferences.emailNotificationsEnabled || preferences.emailDigestFrequency !== 'weekly') {
      return;
    }

    const { dueThisWeek, overdue, semester } = await getAllAssignmentsForDigest(userId);
    const { format } = await import('date-fns');
    const now = new Date();
    
    let content = `<h2 style="color: #667eea;">Your Weekly Assignment Summary</h2>`;
    content += `<p>Here's what's coming up for <strong>${semester.name}</strong> this week:</p>`;
    
    if (overdue.length > 0) {
      content += `<h3 style="color: #dc2626; margin-top: 20px;">Overdue (${overdue.length})</h3><ul>`;
      overdue.forEach((a: any) => {
        const course = a.courseName || 'Unknown Course';
        content += `<li><strong>${a.name}</strong> - ${course}</li>`;
      });
      content += `</ul>`;
    }
    
    if (dueThisWeek.length > 0) {
      content += `<h3 style="color: #3b82f6; margin-top: 20px;">Due This Week (${dueThisWeek.length})</h3><ul>`;
      dueThisWeek.forEach((a: any) => {
        const course = a.courseName || 'Unknown Course';
        const dueDate = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        content += `<li><strong>${a.name}</strong> - ${course} (${format(dueDate, 'MMM d, h:mm a')})</li>`;
      });
      content += `</ul>`;
    }
    
    if (overdue.length === 0 && dueThisWeek.length === 0) {
      content += `<p style="color: #10b981;">🎉 Great job! You have no assignments due this week.</p>`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Assignment Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MyHub</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            ${content}
          </div>
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
            <p>This email was sent from MyHub. You can manage your email preferences in Settings.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to_email: user.email,
      to_name: user.name || 'User',
      subject: `📚 Weekly Assignment Digest - Week of ${format(now, 'MMMM d')}`,
      message: emailHtml,
    });
  } catch (error) {
    console.error('Error sending weekly digest email:', error);
  }
}

/**
 * Test email functionality
 */
export async function sendTestEmail(userId: string): Promise<void> {
  try {
    if (!isEmailConfigured()) {
      throw new Error('Email service not configured. Please set up EmailJS (see EMAIL_SETUP_FREE.md)');
    }

    const user = await getUserData(userId);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MyHub</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea;">Email Setup Successful!</h2>
            <p>If you received this email, your email integration is working correctly.</p>
            <p style="margin-top: 20px; color: #10b981; font-weight: bold;">✅ Your email notifications are ready to go!</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
            <p>This email was sent from MyHub. You can manage your email preferences in Settings.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to_email: user.email,
      to_name: user.name || 'User',
      subject: '✅ MyHub Email Test',
      message: emailHtml,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}
