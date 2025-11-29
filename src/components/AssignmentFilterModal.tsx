import { X, Check, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Assignment, Course } from '../types';
import { formatDate, formatTime, isOverdue } from '../utils/dateHelpers';

interface AssignmentFilterModalProps {
  assignments: Array<{ assignment: Assignment; course: Course }>;
  filterType: 'today' | 'week' | 'overdue';
  onClose: () => void;
  onToggleComplete: (assignmentId: string, completed: boolean) => void;
  title?: string;
}

export default function AssignmentFilterModal({ assignments, filterType, onClose, onToggleComplete, title }: AssignmentFilterModalProps) {
  const navigate = useNavigate();

  const handleAssignmentClick = (courseId: string) => {
    navigate(`/courses/${courseId}`);
    onClose();
  };
  const getTitle = () => {
    if (title) return title;
    switch (filterType) {
      case 'today':
        return 'Due Today';
      case 'week':
        return 'Due This Week';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Assignments';
    }
  };

  const getDescription = () => {
    switch (filterType) {
      case 'today':
        return 'Assignments due today';
      case 'week':
        return 'Assignments due within the next 7 days';
      case 'overdue':
        return 'Assignments that are past their due date';
      default:
        return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{getTitle()}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{getDescription()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No assignments {filterType === 'today' ? 'due today' : filterType === 'week' ? 'due this week' : 'overdue'}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(({ assignment, course }) => {
                const isOverdueAssignment = !assignment.completedAt && isOverdue(new Date(assignment.dueDate));

                return (
                  <div
                    key={assignment.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border ${
                      assignment.completedAt
                        ? 'border-gray-200 dark:border-gray-700 opacity-60'
                        : isOverdueAssignment
                        ? 'border-red-200 dark:border-red-800'
                        : 'border-gray-200 dark:border-gray-700'
                    } hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all cursor-pointer`}
                    onClick={() => handleAssignmentClick(course.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(assignment.id, !assignment.completedAt);
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                            assignment.completedAt
                              ? 'bg-success border-success text-white hover:bg-red-500 hover:border-red-500'
                              : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                          }`}
                          title={assignment.completedAt ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {assignment.completedAt && <Check size={12} />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3
                              className={`text-base font-semibold ${
                                assignment.completedAt
                                  ? 'text-gray-500 dark:text-gray-400 line-through'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {assignment.name}
                            </h3>
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                              {course.courseCode}
                            </span>
                          </div>

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
      </div>
    </div>
  );
}

