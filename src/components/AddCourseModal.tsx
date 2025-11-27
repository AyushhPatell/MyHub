import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { semesterService, courseService } from '../services/firestore';

interface AddCourseModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
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

export default function AddCourseModal({ userId, onClose, onSuccess }: AddCourseModalProps) {
  const [semesterId, setSemesterId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      color: defaultColors[0],
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    loadSemester();
  }, []);

  const loadSemester = async () => {
    try {
      const semester = await semesterService.getActiveSemester(userId);
      if (semester) {
        setSemesterId(semester.id);
      } else {
        alert('No active semester found. Please set up a semester first.');
        onClose();
      }
    } catch (error) {
      console.error('Error loading semester:', error);
      alert('Failed to load semester. Please try again.');
      onClose();
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!semesterId) {
      alert('No active semester found.');
      return;
    }

    setSubmitting(true);
    try {
      await courseService.createCourse(userId, semesterId, {
        courseCode: data.courseCode,
        courseName: data.courseName,
        professor: data.professor || undefined,
        color: data.color,
        schedule: [], // Can be added later
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Course</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Course Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('courseCode', { required: 'Course code is required' })}
              placeholder="CSCI 3172"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.courseCode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.courseCode.message}</p>
            )}
          </div>

          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('courseName', { required: 'Course name is required' })}
              placeholder="Web-Centric Computing"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.courseName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.courseName.message}</p>
            )}
          </div>

          {/* Professor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Professor <span className="text-gray-500 text-xs">Optional</span>
            </label>
            <input
              type="text"
              {...register('professor')}
              placeholder="Dr. Smith"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
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
              {submitting ? 'Adding...' : 'Add Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

