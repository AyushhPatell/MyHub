import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { semesterService, courseService } from '../services/firestore';
import { Semester, Course } from '../types';
import { Plus, BookOpen, Calendar, Edit2, Check, X } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import SemesterSetupModal from '../components/SemesterSetupModal';
import AddCourseModal from '../components/AddCourseModal';
import EditCourseModal from '../components/EditCourseModal';
import SearchBar from '../components/SearchBar';
import QuickAddModal from '../components/QuickAddModal';
import NotificationDropdown from '../components/NotificationDropdown';

export default function CoursesPage() {
  const { user } = useAuth();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSemesterSetup, setShowSemesterSetup] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Active Semester</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Set up your semester to start tracking courses and assignments.
          </p>
          <button
            onClick={() => setShowSemesterSetup(true)}
            className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Courses</h1>
          {isEditingSemester ? (
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="p-1 text-success hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Save"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => {
                  setIsEditingSemester(false);
                  setSemesterName(semester.name);
                }}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 mt-1 group">
              <p className="text-gray-600 dark:text-gray-400">{semester.name}</p>
              <button
                onClick={() => setIsEditingSemester(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                title="Edit semester name"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddCourse(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2 h-10 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Add Course</span>
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2 h-10 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Quick Add</span>
          </button>
          <div className="hidden lg:flex items-center gap-3 h-10">
            <SearchBar />
            {user && <NotificationDropdown userId={user.uid} />}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Courses Yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your first course to start tracking assignments.
          </p>
          <button
            onClick={() => setShowAddCourse(true)}
            className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}

