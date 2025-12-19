/**
 * Admin Configuration
 * 
 * This file contains the list of admin emails.
 * Only these emails can access admin features.
 * 
 * IMPORTANT: Do not expose this in client-side code in a way that
 * allows users to modify it. Admin status should be verified server-side.
 */

export const ADMIN_EMAILS = [
  'aspatel11410@gmail.com'
];

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

