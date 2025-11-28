import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Assignment, Course } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface CalendarWidgetProps {
  size: 'small' | 'medium' | 'large';
  assignments: Assignment[];
  courses: Course[];
  onDateClick?: (date: Date) => void;
}

export default function CalendarWidget({ size, assignments, courses, onDateClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter((assignment) => {
      if (assignment.completedAt) return false;
      const dueDate = new Date(assignment.dueDate);
      return isSameDay(dueDate, date);
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  if (size === 'small') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {format(currentDate, 'MMM yyyy')}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="text-center text-gray-500 dark:text-gray-400 font-medium py-1">
              {day}
            </div>
          ))}
          {daysBeforeMonth.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          {daysInMonth.map((day) => {
            const dayAssignments = getAssignmentsForDate(day);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`aspect-square text-xs rounded transition-colors ${
                  isToday
                    ? 'bg-primary-600 text-white font-semibold'
                    : dayAssignments.length > 0
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title={dayAssignments.length > 0 ? `${dayAssignments.length} assignments` : ''}
              >
                {format(day, 'd')}
                {dayAssignments.length > 0 && (
                  <div className="w-1 h-1 bg-current rounded-full mx-auto mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Medium and Large sizes
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <div className="text-base font-semibold text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={idx} className="text-center text-gray-500 dark:text-gray-400 font-medium py-1.5">
            {day}
          </div>
        ))}
        {daysBeforeMonth.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const dayAssignments = getAssignmentsForDate(day);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`aspect-square text-sm rounded-lg transition-all ${
                isToday
                  ? 'bg-primary-600 text-white font-semibold ring-2 ring-primary-300 dark:ring-primary-700'
                  : dayAssignments.length > 0
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title={
                dayAssignments.length > 0
                  ? `${dayAssignments.length} assignment${dayAssignments.length > 1 ? 's' : ''}`
                  : format(day, 'MMMM d, yyyy')
              }
            >
              <div>{format(day, 'd')}</div>
              {dayAssignments.length > 0 && (
                <div className="text-[10px] mt-0.5 font-medium">{dayAssignments.length}</div>
              )}
            </button>
          );
        })}
      </div>
      {size === 'large' && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Upcoming This Month
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {assignments
              .filter((a) => {
                if (a.completedAt) return false;
                const dueDate = new Date(a.dueDate);
                return isSameMonth(dueDate, currentDate) && dueDate >= new Date();
              })
              .slice(0, 5)
              .map((assignment) => {
                const course = courses.find((c) => c.id === assignment.courseId);
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 text-xs p-1.5 rounded bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: course?.color || '#2563EB' }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{assignment.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{format(new Date(assignment.dueDate), 'MMM d')}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

