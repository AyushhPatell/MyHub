import { User as FirebaseUser } from 'firebase/auth';
import {
  Timestamp,
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const DEMO_SEED_VERSION = 1;

function nowPlusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Seed a realistic dataset for anonymous Try Demo users.
 * This keeps real user data and auth untouched.
 */
export async function bootstrapTryDemoUser(
  user: FirebaseUser
): Promise<void> {
  if (!user.isAnonymous) return;

  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  const existingVersion = Number(existing.data()?.demoSeedVersion || 0);
  if (existingVersion >= DEMO_SEED_VERSION) return;

  const batch = writeBatch(db);
  const createdAt = Timestamp.now();

  batch.set(
    userRef,
    {
      email: 'try-demo@myhub.app',
      name: 'Try Demo User',
      demoMode: true,
      demoSeedVersion: DEMO_SEED_VERSION,
      createdAt,
      preferences: {
        defaultDueTime: '23:59',
        theme: 'light',
        notificationsEnabled: true,
        emailDigestEnabled: false,
        emailDigestFrequency: 'none',
        timezone: 'America/Halifax',
        dateFormat: 'MM/DD/YYYY',
        firstDayOfWeek: 'Monday',
        emailNotificationsEnabled: false,
        emailAssignmentReminders: false,
        emailDigestTime: '09:00',
        emailDigestDay: 'Monday',
      },
    },
    { merge: true }
  );

  const semesterId = 'demo-semester';
  const semesterRef = doc(db, 'users', user.uid, 'semesters', semesterId);

  const semesterStart = new Date();
  semesterStart.setMonth(0, 10);
  const semesterEnd = new Date();
  semesterEnd.setMonth(4, 5);

  batch.set(semesterRef, {
    name: 'Summer 2026 (Demo)',
    startDate: Timestamp.fromDate(semesterStart),
    endDate: Timestamp.fromDate(semesterEnd),
    isActive: true,
    archived: false,
    createdAt,
  });

  const courses = [
    {
      id: 'demo-course-1',
      courseCode: 'CSCI 3172',
      courseName: 'Web-Centric Computing',
      professor: 'Dr. J. Smith',
      color: '#4F46E5',
      schedule: [
        {
          day: 'Monday',
          startTime: '10:30',
          endTime: '11:45',
          location: 'Goldberg 122',
        },
        {
          day: 'Wednesday',
          startTime: '10:30',
          endTime: '11:45',
          location: 'Goldberg 122',
        },
      ],
    },
    {
      id: 'demo-course-2',
      courseCode: 'CSCI 3130',
      courseName: 'Database Systems',
      professor: 'Prof. A. Lee',
      color: '#14B8A6',
      schedule: [
        {
          day: 'Tuesday',
          startTime: '14:00',
          endTime: '15:15',
          location: 'Chase 226',
        },
        {
          day: 'Thursday',
          startTime: '14:00',
          endTime: '15:15',
          location: 'Chase 226',
        },
      ],
    },
    {
      id: 'demo-course-3',
      courseCode: 'CSCI 4152',
      courseName: 'Machine Learning',
      professor: 'Dr. R. Patel',
      color: '#F97316',
      schedule: [
        {
          day: 'Friday',
          startTime: '09:00',
          endTime: '11:00',
          location: 'Online',
        },
      ],
    },
  ] as const;

  for (const c of courses) {
    const courseRef = doc(
      db,
      'users',
      user.uid,
      'semesters',
      semesterId,
      'courses',
      c.id
    );
    batch.set(courseRef, {
      ...c,
      createdAt,
    });
  }

  const assignmentSeed = [
    {
      id: 'demo-a-1',
      courseId: 'demo-course-1',
      name: 'React Dashboard Polish',
      type: 'Project',
      dueDate: nowPlusDays(1),
      gradeWeight: 15,
      priority: 'high',
      isRecurring: false,
    },
    {
      id: 'demo-a-2',
      courseId: 'demo-course-2',
      name: 'ER Diagram Submission',
      type: 'Lab',
      dueDate: nowPlusDays(3),
      gradeWeight: 10,
      priority: 'medium',
      isRecurring: false,
    },
    {
      id: 'demo-a-3',
      courseId: 'demo-course-3',
      name: 'Model Evaluation Reflection',
      type: 'Essay',
      dueDate: nowPlusDays(5),
      gradeWeight: 8,
      priority: 'medium',
      isRecurring: false,
    },
    {
      id: 'demo-a-4',
      courseId: 'demo-course-1',
      name: 'UI Accessibility Checklist',
      type: 'Reading',
      dueDate: nowPlusDays(-1),
      gradeWeight: 4,
      priority: 'urgent',
      isRecurring: false,
    },
  ] as const;

  for (const a of assignmentSeed) {
    const assignmentRef = doc(
      db,
      'users',
      user.uid,
      'semesters',
      semesterId,
      'courses',
      a.courseId,
      'assignments',
      a.id
    );

    batch.set(assignmentRef, {
      name: a.name,
      courseId: a.courseId,
      dueDate: Timestamp.fromDate(a.dueDate),
      type: a.type,
      gradeWeight: a.gradeWeight,
      priority: a.priority,
      isRecurring: a.isRecurring,
      createdAt,
      completedAt: null,
      links: [],
    });
  }

  await batch.commit();
}
