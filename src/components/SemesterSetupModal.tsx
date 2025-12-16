import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { semesterService, courseService } from '../services/firestore';
import ModalContainer from './ModalContainer';

interface SemesterSetupModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SemesterFormData {
  name: string;
  startDate: string;
  endDate: string;
}

interface CourseFormData {
  courseCode: string;
  courseName: string;
  professor?: string;
  color: string;
}

const defaultColors = [
  '#2563EB', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#A855F7', // Violet
];

export default function SemesterSetupModal({ userId, onClose, onSuccess }: SemesterSetupModalProps) {
  const [step, setStep] = useState<'semester' | 'courses'>('semester');
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingSemester, setHasExistingSemester] = useState(false);

  useEffect(() => {
    const checkExistingSemester = async () => {
      try {
        const existing = await semesterService.getActiveSemester(userId);
        setHasExistingSemester(!!existing);
      } catch (error) {
        console.error('Error checking existing semester:', error);
      }
    };
    checkExistingSemester();
  }, [userId]);

  const {
    register: registerSemester,
    handleSubmit: handleSemesterSubmit,
    formState: { errors: semesterErrors },
  } = useForm<SemesterFormData>();

  const handleSemesterFormSubmit = async (data: SemesterFormData) => {
    setSubmitting(true);
    try {
      console.log('Creating semester with data:', data);
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      console.log('Parsed dates:', { startDate, endDate });
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Invalid dates. Please check your date inputs.');
        setSubmitting(false);
        return;
      }
      
      const id = await semesterService.createSemester(userId, {
        name: data.name,
        startDate,
        endDate,
        isActive: true,
      });
      
      console.log('Semester created with ID:', id);
      setSemesterId(id);
      setStep('courses');
    } catch (error) {
      console.error('Error creating semester:', error);
      alert(`Failed to create semester: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addCourse = () => {
    setCourses([
      ...courses,
      {
        courseCode: '',
        courseName: '',
        professor: '',
        color: defaultColors[courses.length % defaultColors.length],
      },
    ]);
  };

  const updateCourse = (index: number, updates: Partial<CourseFormData>) => {
    const updated = [...courses];
    updated[index] = { ...updated[index], ...updates };
    setCourses(updated);
  };

  const removeCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!semesterId) {
      alert('Semester ID is missing. Please try again.');
      return;
    }

    if (courses.length === 0) {
      alert('Please add at least one course.');
      return;
    }

    // Validate that all courses have required fields
    const invalidCourses = courses.filter(
      (course) => !course.courseCode || !course.courseName
    );
    if (invalidCourses.length > 0) {
      alert('Please fill in all required fields for all courses.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Creating courses for semester:', semesterId);
      console.log('Courses to create:', courses);
      
      for (const courseData of courses) {
        if (courseData.courseCode && courseData.courseName) {
          console.log('Creating course:', courseData.courseCode);
          await courseService.createCourse(userId, semesterId, {
            courseCode: courseData.courseCode,
            courseName: courseData.courseName,
            professor: courseData.professor || undefined,
            color: courseData.color,
            schedule: [], // Can be added later
          });
          console.log('Course created successfully:', courseData.courseCode);
        }
      }
      console.log('All courses created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating courses:', error);
      alert(`Failed to create courses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'semester') {
    return (
      <ModalContainer onClose={onClose} backdropClassName="bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set Up Semester</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSemesterSubmit(handleSemesterFormSubmit)} className="p-6 space-y-4">
            {hasExistingSemester && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Starting a New Semester
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Your current semester will be automatically archived. You can switch between semesters anytime from Settings.
                  </p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerSemester('name', { required: 'Semester name is required' })}
                placeholder="e.g., Winter 2026"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {semesterErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{semesterErrors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...registerSemester('startDate', { required: 'Start date is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                style={{ 
                  minWidth: '100%',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  MozAppearance: 'textfield',
                  fontSize: '16px'
                }}
              />
              {semesterErrors.startDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{semesterErrors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...registerSemester('endDate', { required: 'End date is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                style={{ 
                  minWidth: '100%',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  MozAppearance: 'textfield',
                  fontSize: '16px'
                }}
              />
              {semesterErrors.endDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{semesterErrors.endDate.message}</p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Next: Add Courses'}
              </button>
            </div>
          </form>
        </div>
      </ModalContainer>
    );
  }

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black bg-opacity-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Courses</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {courses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No courses added yet</p>
              <button
                onClick={addCourse}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Add First Course
              </button>
            </div>
          )}

          {courses.map((course, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">Course {index + 1}</h3>
                {courses.length > 1 && (
                  <button
                    onClick={() => removeCourse(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={course.courseCode}
                    onChange={(e) => updateCourse(index, { courseCode: e.target.value })}
                    placeholder="CSCI 3172"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateCourse(index, { color })}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          course.color === color
                            ? 'border-gray-900 dark:border-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={course.courseName}
                  onChange={(e) => updateCourse(index, { courseName: e.target.value })}
                  placeholder="Web-Centric Computing"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Professor (Optional)
                </label>
                <input
                  type="text"
                  value={course.professor || ''}
                  onChange={(e) => updateCourse(index, { professor: e.target.value })}
                  placeholder="Dr. Smith"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ))}

          {courses.length > 0 && (
            <button
              onClick={addCourse}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              + Add Another Course
            </button>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => setStep('semester')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleFinish}
              disabled={submitting || courses.length === 0}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Finish Setup'}
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}

