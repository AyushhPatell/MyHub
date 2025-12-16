import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Repeat } from 'lucide-react';
import ModalContainer from './ModalContainer';
import { recurringTemplateService } from '../services/firestore';
import { RecurringTemplate, AssignmentType, RecurrencePattern } from '../types';

interface RecurringTemplateModalProps {
  userId: string;
  semesterId: string;
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
  template?: RecurringTemplate;
}

const assignmentTypes: AssignmentType[] = [
  'Essay',
  'Lab',
  'Quiz',
  'Exam',
  'Discussion Post',
  'Project',
  'Presentation',
  'Reading',
  'Other',
];

const recurrencePatterns: { value: RecurrencePattern; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface FormData {
  name: string;
  assignmentNamePattern: string;
  pattern: RecurrencePattern;
  dayOfWeek: string;
  time: string;
  type: AssignmentType;
  startDate: string;
  endDate: string;
}

export default function RecurringTemplateModal({
  userId,
  semesterId,
  courseId,
  onClose,
  onSuccess,
  template,
}: RecurringTemplateModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      assignmentNamePattern: '',
      pattern: 'weekly',
      dayOfWeek: 'Sunday',
      time: '23:59',
      type: 'Other',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 months from now
    },
  });

  const isEditMode = !!template;

  useEffect(() => {
    try {
      if (template) {
        setValue('name', template.name);
        setValue('assignmentNamePattern', template.assignmentNamePattern);
        setValue('pattern', template.pattern);
        setValue('dayOfWeek', template.dayOfWeek);
        setValue('time', template.time);
        setValue('type', template.type);
        if (template.startDate instanceof Date) {
          setValue('startDate', template.startDate.toISOString().split('T')[0]);
        }
        if (template.endDate instanceof Date) {
          setValue('endDate', template.endDate.toISOString().split('T')[0]);
        }
      } else {
        // Set defaults
        setValue('pattern', 'weekly');
        setValue('dayOfWeek', 'Sunday');
        setValue('time', '23:59');
        setValue('type', 'Other');
        const today = new Date();
        setValue('startDate', today.toISOString().split('T')[0]);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 4); // 4 months from now
        setValue('endDate', endDate.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error setting form values:', error);
    }
  }, [template, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const templateData: Omit<RecurringTemplate, 'id' | 'courseId' | 'createdAt'> = {
        name: data.name,
        assignmentNamePattern: data.assignmentNamePattern,
        pattern: data.pattern,
        dayOfWeek: data.dayOfWeek,
        time: data.time,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };

      if (isEditMode && template) {
        await recurringTemplateService.updateTemplate(userId, semesterId, courseId, template.id, templateData);
      } else {
        await recurringTemplateService.createTemplate(userId, semesterId, courseId, templateData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Click outside to close - simplified
  // The onClick handler on the overlay div handles this now

  // Debug: Log when modal renders
  useEffect(() => {
    console.log('RecurringTemplateModal rendered', { userId, semesterId, courseId, isEditMode });
  }, [userId, semesterId, courseId, isEditMode]);

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black bg-opacity-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Repeat className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Edit Recurring Template' : 'Create Recurring Template'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name', { required: 'Template name is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Weekly Quiz"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Assignment Name Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Name Pattern <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('assignmentNamePattern', { required: 'Pattern is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Quiz {n} or Weekly Assignment"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use {'{n}'} for week/occurrence number (e.g., &quot;Quiz {'{n}'}&quot; becomes &quot;Quiz 1&quot;, &quot;Quiz 2&quot;, etc.)
            </p>
            {errors.assignmentNamePattern && (
              <p className="mt-1 text-sm text-red-500">{errors.assignmentNamePattern.message}</p>
            )}
          </div>

          {/* Recurrence Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recurrence Pattern <span className="text-red-500">*</span>
            </label>
            <select
              {...register('pattern', { required: 'Pattern is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {recurrencePatterns.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Day of Week <span className="text-red-500">*</span>
            </label>
            <select
              {...register('dayOfWeek', { required: 'Day is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              {...register('time', { required: 'Time is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('type', { required: 'Type is required' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {assignmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('endDate', { required: 'End date is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : isEditMode ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </ModalContainer>
  );
}

