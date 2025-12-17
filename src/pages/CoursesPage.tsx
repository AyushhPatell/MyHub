import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService } from '../services/firestore';
import { Semester, Course } from '../types';
import { Plus, Calendar, Edit2, Check, X } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import SemesterSetupModal from '../components/SemesterSetupModal';
import AddCourseModal from '../components/AddCourseModal';
import EditCourseModal from '../components/EditCourseModal';
import QuickAddModal from '../components/QuickAddModal';
import ScheduleModal from '../components/ScheduleModal';

export default function CoursesPage() {
  const { user } = useAuth();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSemesterSetup, setShowSemesterSetup] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditingSemester, setIsEditingSemester] = useState(false);
  const [semesterName, setSemesterName] = useState('');

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
        setSemesterName(activeSemester.name);
        const courseList = await courseService.getCourses(user.uid, activeSemester.id);
        setCourses(courseList);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSemesterName = async () => {
    if (!user || !semester || !semesterName.trim()) {
      setSemesterName(semester?.name || '');
      setIsEditingSemester(false);
      return;
    }

    try {
      await semesterService.updateSemester(user.uid, semester.id, {
        name: semesterName.trim(),
      });
      setSemester({ ...semester, name: semesterName.trim() });
      setIsEditingSemester(false);
    } catch (error) {
      console.error('Error updating semester name:', error);
      alert('Failed to update semester name. Please try again.');
      setSemesterName(semester.name);
      setIsEditingSemester(false);
    }
  };

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
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">No Active Semester</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Set up your semester to start tracking courses and assignments.
            </p>
          </div>
          <button
            onClick={() => setShowSemesterSetup(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl hover:scale-105 transition-transform shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Set Up Semester
          </button>
        </div>

        {showSemesterSetup && (
          <SemesterSetupModal
            userId={user!.uid}
            onClose={() => setShowSemesterSetup(false)}
            onSuccess={() => {
              setShowSemesterSetup(false);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pb-safe">
      {/* Page Header - Full Width */}
      <div className="w-full px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
              Courses
            </h1>
            {isEditingSemester ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  className="px-4 py-2 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl bg-white dark:bg-gray-800/50 backdrop-blur-xl text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSemesterName();
                    } else if (e.key === 'Escape') {
                      setIsEditingSemester(false);
                      setSemesterName(semester.name);
                    }
                  }}
                />
                <button
                  onClick={handleSaveSemesterName}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                  title="Save"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingSemester(false);
                    setSemesterName(semester.name);
                  }}
                  className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  title="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <p className="text-gray-600 dark:text-gray-300 font-semibold">{semester.name}</p>
                <button
                  onClick={() => setIsEditingSemester(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                  title="Edit semester name"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-xs sm:text-base"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Course Schedule</span>
              <span className="sm:hidden">Schedule</span>
            </button>
            <button
              onClick={() => setShowAddCourse(true)}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-xs sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Course</span>
              <span className="sm:hidden">Add Course</span>
            </button>
            <button
              onClick={() => setShowQuickAdd(true)}
              data-quick-add="true"
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-xs sm:text-base"
              title={`Quick Add Assignment (${navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+N)`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Quick Add</span>
              <span className="sm:hidden">Quick Add</span>
            </button>
          </div>
        </div>

        {/* Courses Grid - Full Width */}
        {courses.length === 0 ? (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-gray-200 dark:border-white/10 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Courses Yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Add your first course to start tracking assignments.
            </p>
            <button
              onClick={() => setShowAddCourse(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                semesterId={semester.id}
                onEdit={setEditingCourse}
              />
            ))}
          </div>
        )}
      </div>

      {showAddCourse && user && (
        <AddCourseModal
          userId={user.uid}
          onClose={() => setShowAddCourse(false)}
          onSuccess={() => {
            setShowAddCourse(false);
            loadData();
          }}
        />
      )}

      {editingCourse && user && semester && (
        <EditCourseModal
          userId={user.uid}
          semesterId={semester.id}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSuccess={() => {
            setEditingCourse(null);
            loadData();
          }}
          onDelete={() => {
            setEditingCourse(null);
            loadData();
          }}
        />
      )}

      {showQuickAdd && user && semester && (
        <QuickAddModal
          userId={user.uid}
          semesterId={semester.id}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={() => {
            setShowQuickAdd(false);
            loadData();
          }}
        />
      )}

      {showSchedule && (
        <ScheduleModal onClose={() => setShowSchedule(false)} />
      )}
    </div>
  );
}
