import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { semesterService, assignmentService, notificationService } from '../services/firestore';
import { Semester, Assignment } from '../types';
import { formatDate, formatTime, isDueToday, getDaysUntilDue, getTodayRange, getWeekRange } from '../utils/dateHelpers';
import { calculatePriority, getPriorityColor } from '../utils/priority';
import { Calendar, Plus, AlertCircle, Sparkles, LayoutGrid, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import QuickAddModal from '../components/QuickAddModal';
import AssignmentFilterModal from '../components/AssignmentFilterModal';
import { courseService } from '../services/firestore';
import { Course } from '../types';
import SearchBar from '../components/SearchBar';
import NotificationDropdown from '../components/NotificationDropdown';

export default function DashboardPage() {
  const { user } = useAuth();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState<'today' | 'week' | 'overdue' | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const activeSemester = await semesterService.getActiveSemester(user.uid);
      setSemester(activeSemester);

      if (activeSemester) {
        const allAssignments = await assignmentService.getAllAssignments(user.uid, activeSemester.id);
        const courseList = await courseService.getCourses(user.uid, activeSemester.id);
        // Update priorities
        const assignmentsWithPriority = allAssignments.map((assignment) => ({
          ...assignment,
          priority: calculatePriority(assignment),
        }));
        setAssignments(assignmentsWithPriority);
        setCourses(courseList);

        // Check and create notifications for upcoming deadlines
        try {
          await notificationService.checkAndCreateNotifications(user.uid, activeSemester.id);
        } catch (error) {
          console.error('Error checking notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-12">
        {/* Welcome Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-2xl mb-6">
            <LayoutGrid className="w-10 h-10 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Welcome to MyHub</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your personal dashboard is being built. We're working on adding more features and integrations.
          </p>
        </div>

        {/* Quick Start Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Get Started</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              To start tracking your academic courses and assignments, set up your first semester.
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Set Up Semester
            </Link>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-primary-200 dark:border-primary-800">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">More Features Coming Soon</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We're continuously working on expanding MyHub with new features and integrations. 
                Stay tuned for API feeds, widgets, and more personalization options.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                  API Feeds
                </span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                  Weather Widget
                </span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                  News Feeds
                </span>
                <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                  And More...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayRange = getTodayRange();
  const weekRange = getWeekRange();

  const todayAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= todayRange.start && dueDate <= todayRange.end;
  });

  const weekAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= weekRange.start && dueDate <= weekRange.end;
  });

  const overdueAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    return new Date(a.dueDate) < todayRange.start;
  });

  const getFilteredAssignments = (filterType: 'today' | 'week' | 'overdue') => {
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
  };

  const handleMarkComplete = async (assignmentId: string, completed: boolean) => {
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
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {formatDate(today)} • {semester.name}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <SearchBar />
          {user && <NotificationDropdown userId={user.uid} />}
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowFilterModal('today')}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-lg transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Due Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{todayAssignments.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm">
              <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowFilterModal('week')}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-lg transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">This Week</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{weekAssignments.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowFilterModal('overdue')}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-lg transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Overdue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{overdueAssignments.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </button>
      </div>

      {/* Coming Soon Section */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-primary-200 dark:border-primary-800">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">More Features Coming Soon</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We're continuously working on expanding MyHub with new features and integrations. 
              Stay tuned for API feeds, widgets, and more personalization options.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                API Feeds
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                Weather Widget
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                News Feeds
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                And More...
              </span>
            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <AssignmentFilterModal
          assignments={getFilteredAssignments(showFilterModal)}
          filterType={showFilterModal}
          onClose={() => setShowFilterModal(null)}
          onToggleComplete={handleMarkComplete}
        />
      )}
    </div>
  );
}

