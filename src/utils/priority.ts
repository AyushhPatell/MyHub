import { Assignment, AssignmentPriority } from '../types';

/**
 * Calculate assignment priority based on due date only
 * Simplified version - no weight or workload consideration
 */
export function calculatePriority(assignment: Assignment): AssignmentPriority {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return "urgent"; // Overdue
  if (hoursUntilDue < 24) return "urgent"; // Due today
  if (hoursUntilDue < 72) return "high"; // Due within 3 days
  if (hoursUntilDue < 168) return "medium"; // Due within 1 week
  return "low"; // More than 1 week away
}

export function getPriorityColor(priority: AssignmentPriority): string {
  switch (priority) {
    case "urgent":
      return "text-danger bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case "high":
      return "text-warning bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    case "medium":
      return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    case "low":
      return "text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    default:
      return "text-gray-600 bg-gray-50 dark:bg-gray-800";
  }
}

