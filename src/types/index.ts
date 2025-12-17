// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultDueTime: string; // "23:59"
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  emailDigestEnabled: boolean;
  emailDigestFrequency: "daily" | "weekly" | "none";
  timezone: string; // "America/Halifax"
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY";
  firstDayOfWeek: "Sunday" | "Monday";
  // Dark Mode Scheduling
  darkModeScheduleEnabled?: boolean;
  darkModeScheduleType?: "time" | "sunset" | "sunrise";
  darkModeScheduleTimeFrom?: string; // "18:00" - when to switch to dark mode
  darkModeScheduleTimeTo?: string; // "07:00" - when to switch back to light mode
  darkModeScheduleLocation?: {
    lat: number;
    lng: number;
  }; // For sunset/sunrise calculations
  // Email Preferences
  emailNotificationsEnabled?: boolean; // Master toggle for all email notifications
  emailAssignmentReminders?: boolean; // Individual assignment reminders (due today, 1 day, 3 days, overdue)
  emailDigestTime?: string; // "09:00" - Time of day to send digest emails
  emailDigestDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"; // Day of week for weekly digest
}

// Semester Types
export interface Semester {
  id: string;
  userId: string;
  name: string; // "Winter 2026"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  archived?: boolean; // If true, semester is archived (only 1 archived semester kept)
  createdAt: Date;
}

// Course Types
export interface Course {
  id: string;
  semesterId: string;
  courseCode: string; // "CSCI 3172" - Course identifier
  courseName: string; // "Web-Centric Computing"
  professor?: string;
  color: string; // Hex code, e.g., "#2563EB"
  schedule: ClassSchedule[];
  createdAt: Date;
}

export interface ClassSchedule {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string; // "10:00"
  endTime: string; // "11:30"
  location?: string;
}

// Assignment Types
export type AssignmentType = 
  | "Essay" 
  | "Lab" 
  | "Quiz" 
  | "Exam" 
  | "Discussion Post" 
  | "Project" 
  | "Presentation"
  | "Reading"
  | "Other";

export type AssignmentPriority = "low" | "medium" | "high" | "urgent";

export interface Assignment {
  id: string;
  courseId: string;
  name: string;
  dueDate: Date;
  type: AssignmentType;
  gradeWeight?: number; // Optional: percentage of course grade (e.g., 3, 10)
  priority: AssignmentPriority; // Auto-calculated
  links?: string[]; // Optional URLs
  isRecurring: boolean;
  recurringTemplateId?: string;
  createdAt: Date;
  completedAt?: Date; // When marked complete
}

// Recurring Template Types
export type RecurrencePattern = 
  | "weekly" 
  | "biweekly" 
  | "monthly" 
  | "custom";

export interface RecurringTemplate {
  id: string;
  courseId: string;
  name: string;
  assignmentNamePattern: string;
  pattern: RecurrencePattern;
  dayOfWeek: string;
  time: string; // "23:59"
  type: AssignmentType;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

// Quick Note Types
export interface QuickNote {
  id: string;
  userId: string;
  content: string;
  tags?: string[];
  color?: string; // For color-coded notes
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export type NotificationType = 
  | "deadline-soon" 
  | "deadline-today" 
  | "overdue" 
  | "course-update"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedItemId?: string;
  relatedItemType?: "assignment" | "course";
  isRead: boolean;
  createdAt: Date;
}

// Widget Types
export type WidgetType = "weather" | "notes" | "calendar" | "stats" | "schedule";

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  position: number; // Order in grid
  visible: boolean;
  settings?: Record<string, any>; // Widget-specific settings
}

export interface DashboardLayout {
  userId: string;
  widgets: WidgetConfig[];
  updatedAt: Date;
}

// Calendar Events (for personal events in calendar widget)
export interface CalendarEvent {
  id: string;
  userId: string;
  semesterId: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Weather Widget Types
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike?: number;
  pressure?: number;
  uvIndex?: number;
  visibility?: number; // in km
  sunrise?: Date;
  sunset?: Date;
  forecast: {
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }[];
}

// Schedule Block Types
export type ScheduleBlockType = 'lecture' | 'tutorial';

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduleBlock {
  id: string;
  userId: string;
  semesterId: string;
  courseId: string;
  type: ScheduleBlockType;
  dayOfWeek: DayOfWeek;
  startTime: string; // "14:00" (2:00 PM)
  endTime: string; // "15:30" (3:30 PM)
  location?: {
    building?: string;
    room?: string;
  };
  instructorName?: string;
  sectionNumber?: string;
  scheduleType?: string; // "Lecture", "Tutorial", etc.
  crn?: string;
  courseNumber?: string;
  title?: string;
  subject?: string;
  associatedTerm?: string;
  createdAt: Date;
  updatedAt: Date;
}


