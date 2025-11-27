import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, assignmentService } from '../services/firestore';
import { Course, Assignment } from '../types';
import { formatDate, formatTime, isOverdue, getDaysUntilDue } from '../utils/dateHelpers';
import { calculatePriority, getPriorityColor } from '../utils/priority';
import { ArrowLeft, Plus, Check, X, ExternalLink, Edit, Trash2, Calendar } from 'lucide-react';
import QuickAddModal from '../components/QuickAddModal';
import EditAssignmentModal from '../components/EditAssignmentModal';
import SearchBar from '../components/SearchBar';

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    if (user && courseId) {
      loadData();
    }
  }, [user, courseId]);

  const loadData = async () => {
    if (!user || !courseId) return;
    try {
      setLoading(true);
      const semester = await semesterService.getActiveSemester(user.uid);
      if (semester) {
        setSemesterId(semester.id);
        const courseData = await courseService.getCourse(user.uid, semester.id, courseId);
        setCourse(courseData);

        const assignmentList = await assignmentService.getAssignments(user.uid, semester.id, courseId);
        const assignmentsWithPriority = assignmentList.map((assignment) => ({
          ...assignment,
          priority: calculatePriority(assignment),
        }));
        setAssignments(assignmentsWithPriority);
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (assignmentId: string, completed: boolean) => {
    if (!user || !courseId) return;
    try {
      const semester = await semesterService.getActiveSemester(user.uid);
      if (semester) {
        await assignmentService.markComplete(user.uid, semester.id, courseId, assignmentId, completed);
        loadData();
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course Not Found</h2>
        <Link to="/courses" className="text-primary-600 dark:text-primary-400 hover:underline">
          Back to Courses
        </Link>
      </div>
    );
  }

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'completed') return !!a.completedAt;
    if (filter === 'upcoming') return !a.completedAt;
    return true;
  }).sort((a, b) => {
    // Sort completed assignments by completion date (most recent first)
    if (a.completedAt && b.completedAt) {
      return b.completedAt.getTime() - a.completedAt.getTime();
    }
    // Sort upcoming by due date
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const upcomingCount = assignments.filter((a) => !a.completedAt).length;
  const completedCount = assignments.filter((a) => !!a.completedAt).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/courses"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.courseCode}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{course.courseName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Assignment</span>
          </button>
          <div className="hidden lg:block">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Course Info Card */}
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        style={{ borderLeftColor: course.color, borderLeftWidth: '4px' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {course.professor && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Professor</p>
              <p className="font-medium text-gray-900 dark:text-white">{course.professor}</p>
            </div>
          )}
          {course.schedule.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Schedule</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {course.schedule.map((schedule, index) => (
                  <span
                    key={index}
                    className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {schedule.day} {schedule.startTime} - {schedule.endTime}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'upcoming'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All ({assignments.length})
        </button>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'completed' ? 'No completed assignments yet' : 'No assignments yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const isOverdueAssignment = isOverdue(new Date(assignment.dueDate));
            const daysUntil = getDaysUntilDue(new Date(assignment.dueDate));

            return (
              <div
                key={assignment.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border ${
                  assignment.completedAt
                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                    : isOverdueAssignment
                    ? 'border-red-200 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700'
                } hover:shadow-md transition-all`}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleMarkComplete(assignment.id, !assignment.completedAt)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer group flex-shrink-0 ${
                        assignment.completedAt
                          ? 'bg-success border-success text-white hover:bg-red-500 hover:border-red-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      }`}
                      title={assignment.completedAt ? 'Click again to mark as incomplete (undo)' : 'Click to mark as complete'}
                    >
                      {assignment.completedAt && <Check size={12} className="group-hover:hidden" />}
                      {assignment.completedAt && (
                        <X size={10} className="hidden group-hover:block text-white" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-base font-semibold ${
                              assignment.completedAt
                                ? 'text-gray-500 dark:text-gray-400 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {assignment.name}
                          </h3>
                        </div>
                        <button
                          onClick={() => setEditingAssignment(assignment)}
                          className="flex items-center space-x-1 px-2.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 ml-2"
                          title="Edit assignment"
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="flex items-center text-gray-600 dark:text-gray-400">
                            <Calendar size={12} className="mr-1.5" />
                            {formatDate(new Date(assignment.dueDate))} at {formatTime(new Date(assignment.dueDate))}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                            {assignment.type}
                          </span>
                          {assignment.gradeWeight && (
                            <span className="text-gray-600 dark:text-gray-400 text-xs">
                              {assignment.gradeWeight}% of course grade
                            </span>
                          )}
                          {!assignment.completedAt && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityColor(
                                assignment.priority
                              )}`}
                            >
                              {assignment.priority}
                            </span>
                          )}
                          {isOverdueAssignment && !assignment.completedAt && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium text-xs">
                              Overdue
                            </span>
                          )}
                          {!isOverdueAssignment && !assignment.completedAt && daysUntil > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium text-xs">
                              {daysUntil} days away
                            </span>
                          )}
                        </div>

                        {assignment.links && assignment.links.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {assignment.links.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} className="mr-1" />
                                Link {index + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingAssignment && user && semesterId && (
        <EditAssignmentModal
          userId={user.uid}
          semesterId={semesterId}
          courseId={courseId!}
          assignment={editingAssignment}
          onClose={() => setEditingAssignment(null)}
          onSuccess={() => {
            setEditingAssignment(null);
            loadData();
          }}
          onDelete={() => {
            setEditingAssignment(null);
            loadData();
          }}
        />
      )}

      {showQuickAdd && user && semesterId && (
        <QuickAddModal
          userId={user.uid}
          semesterId={semesterId}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={() => {
            setShowQuickAdd(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

