import { useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { assignmentService } from '../services/firestore';
import { Assignment, AssignmentType } from '../types';
import ModalContainer from './ModalContainer';

interface EditAssignmentModalProps {
  userId: string;
  semesterId: string;
  courseId: string;
  assignment: Assignment;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

interface FormData {
  name: string;
  dueDate: string;
  dueTime: string;
  type: AssignmentType;
  gradeWeight?: number;
  links?: string;
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

export default function EditAssignmentModal({
  userId,
  semesterId,
  courseId,
  assignment,
  onClose,
  onSuccess,
  onDelete,
}: EditAssignmentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: assignment.name,
      dueDate: new Date(assignment.dueDate).toISOString().split('T')[0],
      dueTime: new Date(assignment.dueDate).toTimeString().slice(0, 5),
      type: assignment.type,
      gradeWeight: assignment.gradeWeight,
      links: assignment.links?.join(', ') || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const dueDateTime = new Date(`${data.dueDate}T${data.dueTime}`);
      const links = data.links
        ? data.links.split(',').map((link) => link.trim()).filter(Boolean)
        : [];

      const updates: any = {
        name: data.name,
        dueDate: dueDateTime,
        type: data.type,
      };

      if (data.gradeWeight && Number(data.gradeWeight) > 0) {
        updates.gradeWeight = Number(data.gradeWeight);
      } else {
        updates.gradeWeight = null;
      }

      if (links.length > 0) {
        updates.links = links;
      } else {
        updates.links = null;
      }

      await assignmentService.updateAssignment(userId, semesterId, courseId, assignment.id, updates);
      onSuccess();
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await assignmentService.deleteAssignment(userId, semesterId, courseId, assignment.id);
      onDelete();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black bg-opacity-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-medium text-red-900 dark:text-red-200 mb-2">Delete Assignment?</h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Are you sure you want to delete "{assignment.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Assignment Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: 'Assignment name is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('dueDate', { required: 'Due date is required' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Due Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Time
              </label>
              <input
                type="time"
                {...register('dueTime')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                {...register('type')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {assignmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Weight (% of course grade) <span className="text-gray-500 text-xs">Optional</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('gradeWeight', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                  max: { value: 100, message: 'Must be 100 or less' },
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.gradeWeight && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gradeWeight.message}</p>
              )}
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Links <span className="text-gray-500 text-xs">Optional (comma-separated)</span>
              </label>
              <input
                type="text"
                {...register('links')}
                placeholder="https://brightspace.dal.ca/..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
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
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalContainer>
  );
}

