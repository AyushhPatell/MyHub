import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { semesterService, assignmentService, notificationService } from '../services/firestore';
import { Semester, Assignment } from '../types';
import { formatDate, getTodayRange, getWeekRange } from '../utils/dateHelpers';
import { calculatePriority } from '../utils/priority';
import { Plus, LayoutGrid } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AssignmentFilterModal from '../components/AssignmentFilterModal';
import { courseService } from '../services/firestore';
import { Course } from '../types';
import WidgetGrid from '../components/WidgetGrid';

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState<'today' | 'week' | 'overdue' | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<{ date: Date; assignments: Array<{ assignment: Assignment; course: Course }> } | null>(null);
  const initialEditMode = searchParams.get('edit') === 'true';

  // All hooks must be called before any early returns
  const today = useMemo(() => new Date(), []);
  const todayRange = useMemo(() => getTodayRange(), []);
  const weekRange = useMemo(() => getWeekRange(), []);

  const todayAssignments = useMemo(() => assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= todayRange.start && dueDate <= todayRange.end;
  }), [assignments, todayRange]);

  const weekAssignments = useMemo(() => assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= weekRange.start && dueDate <= weekRange.end;
  }), [assignments, weekRange]);

  const overdueAssignments = useMemo(() => assignments.filter((a) => {
    if (a.completedAt) return false;
    return new Date(a.dueDate) < todayRange.start;
  }), [assignments, todayRange]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const activeSemester = await semesterService.getActiveSemester(user.uid);
      setSemester(activeSemester);

      if (activeSemester) {
        const [allAssignments, courseList] = await Promise.all([
          assignmentService.getAllAssignments(user.uid, activeSemester.id),
          courseService.getCourses(user.uid, activeSemester.id)
        ]);
        
        const assignmentsWithPriority = allAssignments.map((assignment) => ({
          ...assignment,
          priority: calculatePriority(assignment),
        }));
        setAssignments(assignmentsWithPriority);
        setCourses(courseList);

        // Run notification check in background without blocking
        notificationService.checkAndCreateNotifications(user.uid, activeSemester.id).catch((error) => {
          console.error('Error checking notifications:', error);
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getFilteredAssignments = useCallback((filterType: 'today' | 'week' | 'overdue') => {
    let filtered: Assignment[];
    switch (filterType) {
      case 'today':
        filtered = todayAssignments;
        break;
      case 'week':
        filtered = weekAssignments;
        break;
      case 'overdue':
        filtered = overdueAssignments;
        break;
      default:
        filtered = [];
    }

    return filtered.map((assignment) => {
      const course = courses.find((c) => c.id === assignment.courseId);
      return {
        assignment,
        course: course || { id: '', courseCode: 'Unknown', courseName: 'Unknown Course', color: '#2563EB' } as Course,
      };
    });
  }, [todayAssignments, weekAssignments, overdueAssignments, courses]);

  const handleMarkComplete = useCallback(async (assignmentId: string, completed: boolean) => {
    if (!user || !semester) return;

    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      await assignmentService.markComplete(
        user.uid,
        semester.id,
        assignment.courseId,
        assignmentId,
        completed
      );
      loadData();
    } catch (error) {
      console.error('Error marking assignment complete:', error);
    }
  }, [user, semester, assignments, loadData]);

  const handleStatClick = useCallback((type: 'today' | 'week' | 'overdue') => {
    setShowFilterModal(type);
  }, []);

  const handleCalendarDateClick = useCallback((date: Date, dayAssignments: Assignment[]) => {
    if (dayAssignments.length > 0) {
      const assignmentList = dayAssignments.map((assignment: Assignment) => {
        const course = courses.find((c) => c.id === assignment.courseId);
        return {
          assignment,
          course: course || { id: '', courseCode: 'Unknown', courseName: 'Unknown Course', color: '#2563EB' } as Course,
        };
      });
      setShowCalendarModal({ date, assignments: assignmentList });
    }
  }, [courses]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mb-4 shadow-2xl">
            <LayoutGrid className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
              Welcome to MyHub
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Your personal command center for academic success
            </p>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl hover:scale-105 transition-transform shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Page Header - Full Width */}
      <div className="w-full px-6 lg:px-12 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold uppercase tracking-wide">
            {formatDate(today)} • {semester.name.toUpperCase()}
          </p>
        </div>

        {/* Widget Grid - Full Width */}
        {user && (
          <WidgetGrid
            userId={user.uid}
            assignments={assignments}
            courses={courses}
            onStatClick={handleStatClick}
            onCalendarDateClick={handleCalendarDateClick}
            initialEditMode={initialEditMode}
          />
        )}
      </div>

      {showFilterModal && (
        <AssignmentFilterModal
          assignments={getFilteredAssignments(showFilterModal)}
          filterType={showFilterModal}
          onClose={() => setShowFilterModal(null)}
          onToggleComplete={handleMarkComplete}
        />
      )}

      {showCalendarModal && (
        <AssignmentFilterModal
          assignments={showCalendarModal.assignments}
          filterType="today"
          onClose={() => setShowCalendarModal(null)}
          onToggleComplete={handleMarkComplete}
          title={`Assignments for ${formatDate(showCalendarModal.date)}`}
        />
      )}
    </div>
  );
}
