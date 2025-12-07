import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService, assignmentService, recurringTemplateService, notificationService } from '../services/firestore';
import { Course, Assignment, RecurringTemplate } from '../types';
import { formatDate, formatTime, isOverdue, getDaysUntilDue } from '../utils/dateHelpers';
import { calculatePriority, getPriorityColor } from '../utils/priority';
import { ArrowLeft, Plus, Check, ExternalLink, Edit, Trash2, Calendar, Repeat, Play } from 'lucide-react';
import QuickAddModal from '../components/QuickAddModal';
import EditAssignmentModal from '../components/EditAssignmentModal';
import RecurringTemplateModal from '../components/RecurringTemplateModal';

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
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);

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

        const templateList = await recurringTemplateService.getTemplates(user.uid, semester.id, courseId);
        setTemplates(templateList);

        try {
          await notificationService.checkAndCreateNotifications(user.uid, semester.id);
        } catch (error) {
          console.error('Error checking notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromTemplate = async (templateId: string) => {
    if (!user || !courseId || !semesterId) return;
    try {
      await recurringTemplateService.generateAssignmentsFromTemplate(user.uid, semesterId, courseId, templateId);
      loadData();
      alert('Assignments generated successfully!');
    } catch (error) {
      console.error('Error generating assignments:', error);
      alert('Failed to generate assignments. Please try again.');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user || !courseId || !semesterId) return;
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await recurringTemplateService.deleteTemplate(user.uid, semesterId, courseId, templateId);
      loadData();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Course Not Found</h2>
          <Link to="/courses" className="text-indigo-400 hover:underline font-semibold">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'completed') return !!a.completedAt;
    if (filter === 'upcoming') return !a.completedAt;
    return true;
  }).sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return b.completedAt.getTime() - a.completedAt.getTime();
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const upcomingCount = assignments.filter((a) => !a.completedAt).length;
  const completedCount = assignments.filter((a) => !!a.completedAt).length;

  return (
    <div className="min-h-screen w-full pb-safe">
      {/* Page Header - Full Width */}
      <div className="w-full px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/courses"
              className="p-2 hover:bg-white/5 rounded-xl transition-colors touch-manipulation"
              style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
                {course.courseCode}
              </h1>
              <p className="text-sm sm:text-base text-gray-900 dark:text-gray-300 font-semibold">
                {course.courseName}
              </p>
            </div>
          </div>
          {/* Desktop/Tablet: Add Assignment and Create Recurring Template side by side */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-sm"
            >
              <Repeat className="w-4 h-4" />
              <span>Create Recurring Template</span>
            </button>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-base touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <Plus className="w-5 h-5" />
              <span>Add Assignment</span>
            </button>
          </div>
        </div>

        {/* Mobile: Professor box first, then Add Assignment, then Create Recurring Template */}
        <div className="md:hidden space-y-4 mb-6">
          {/* Professor Info - Mobile Only */}
          {course.professor && (
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-4 shadow-xl">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Professor
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-white">{course.professor}</p>
            </div>
          )}
          
          {/* Add Assignment Button - Mobile */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-sm touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
          
          {/* Create Recurring Template Button - Mobile */}
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-sm"
          >
            <Repeat className="w-4 h-4" />
            <span>Create Recurring Template</span>
          </button>
        </div>

        {/* Course Info - Desktop/Tablet */}
        <div className="hidden md:block bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-5 mb-4 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {course.professor && (
              <div>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Professor
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{course.professor}</p>
              </div>
            )}
            {course.schedule.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Schedule
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {course.schedule.map((schedule, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold border border-indigo-200 dark:border-indigo-500/30"
                    >
                      {schedule.day.substring(0, 3)} {schedule.startTime}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recurring Templates List - Only show if templates exist */}
        {templates.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Recurring Templates ({templates.length})
              </h2>
            </div>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate">{template.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {template.pattern} • {template.dayOfWeek} at {template.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => handleGenerateFromTemplate(template.id)}
                      className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors touch-manipulation"
                      style={{ minWidth: '36px', minHeight: '36px' }}
                      title="Generate assignments"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors touch-manipulation"
                      style={{ minWidth: '36px', minHeight: '36px' }}
                      title="Edit template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors touch-manipulation"
                      style={{ minWidth: '36px', minHeight: '36px' }}
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters - Stack on mobile, horizontal on larger screens */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              filter === 'upcoming'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                : 'bg-white/60 dark:bg-white/5 backdrop-blur-xl text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
            }`}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                : 'bg-white/60 dark:bg-white/5 backdrop-blur-xl text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                : 'bg-white/60 dark:bg-white/5 backdrop-blur-xl text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
            }`}
          >
            All ({assignments.length})
          </button>
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 p-12 text-center shadow-xl">
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {filter === 'completed' ? 'No completed assignments yet' : 'No assignments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const isOverdueAssignment = isOverdue(new Date(assignment.dueDate));
              const daysUntil = getDaysUntilDue(new Date(assignment.dueDate));

              return (
                <div
                  key={assignment.id}
                  className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl ${
                    assignment.completedAt
                      ? 'border-gray-200 dark:border-white/10 opacity-60'
                      : isOverdueAssignment
                      ? 'border-red-300 dark:border-red-500/30'
                      : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleMarkComplete(assignment.id, !assignment.completedAt)}
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 mt-0.5 ${
                          assignment.completedAt
                            ? 'bg-green-500 border-green-500 text-white hover:bg-red-500 hover:border-red-500'
                            : 'border-gray-300 dark:border-gray-400 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20'
                        }`}
                      >
                        {assignment.completedAt && <Check size={12} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3
                            className={`text-base font-bold ${
                              assignment.completedAt
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {assignment.name}
                          </h3>
                          <button
                            onClick={() => setEditingAssignment(assignment)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors font-semibold flex-shrink-0 ml-3"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        </div>

                          <div className="border-t border-gray-200 dark:border-white/10 pt-2.5 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                              <Calendar size={14} />
                              {formatDate(new Date(assignment.dueDate))} at {formatTime(new Date(assignment.dueDate))}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200 dark:border-indigo-500/30">
                              {assignment.type}
                            </span>
                            {assignment.gradeWeight && (
                              <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                                {assignment.gradeWeight}% of course grade
                              </span>
                            )}
                            {!assignment.completedAt && (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border-2 ${getPriorityColor(
                                  assignment.priority
                                )}`}
                              >
                                {assignment.priority}
                              </span>
                            )}
                            {isOverdueAssignment && !assignment.completedAt && (
                              <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold text-[10px] border border-red-200 dark:border-red-500/30">
                                Overdue
                              </span>
                            )}
                            {!isOverdueAssignment && !assignment.completedAt && daysUntil > 0 && (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-500/30">
                                {daysUntil} days away
                              </span>
                            )}
                          </div>

                          {assignment.links && assignment.links.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {assignment.links.map((link, index) => (
                                <a
                                  key={index}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={12} />
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
      </div>

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

      {showTemplateModal && user && semesterId && courseId && (
        <RecurringTemplateModal
          userId={user.uid}
          semesterId={semesterId}
          courseId={courseId}
          template={editingTemplate || undefined}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
