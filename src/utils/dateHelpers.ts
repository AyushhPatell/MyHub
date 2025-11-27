import { format, isToday, isPast, startOfDay, endOfDay } from 'date-fns';

export function formatDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function isDueToday(date: Date): boolean {
  return isToday(date);
}

export function isOverdue(date: Date): boolean {
  return isPast(date) && !isToday(date);
}

export function getDaysUntilDue(date: Date): number {
  const now = startOfDay(new Date());
  const due = startOfDay(date);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getTodayRange() {
  return {
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  };
}

export function getWeekRange() {
  const now = new Date();
  const start = startOfDay(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return {
    start,
    end: endOfDay(end),
  };
}

