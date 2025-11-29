import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Assignment, Course } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface CalendarWidgetProps {
  size: 'small' | 'medium' | 'large';
  assignments: Assignment[];
  courses: Course[];
  onDateClick?: (date: Date, assignments: Assignment[]) => void;
}

export default function CalendarWidget({ size, assignments, courses, onDateClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
      const dayAssignments = getAssignmentsForDate(date);
      onDateClick(date, dayAssignments);
    }
  };

  if (size === 'small') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {format(currentDate, 'MMM yyyy')}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="text-center text-gray-400 dark:text-gray-500 font-bold py-2">
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
                className={`aspect-square text-xs rounded-2xl transition-all font-bold ${
                  isToday
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
                    : dayAssignments.length > 0
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                }`}
                title={dayAssignments.length > 0 ? `${dayAssignments.length} assignments` : ''}
              >
                {format(day, 'd')}
                {dayAssignments.length > 0 && (
                  <div className="w-1.5 h-1.5 bg-current rounded-full mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Medium and Large
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2.5 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={idx} className="text-center text-gray-400 dark:text-gray-500 font-bold py-3">
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
              className={`aspect-square text-sm rounded-2xl transition-all font-bold ${
                isToday
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 shadow-lg'
                  : dayAssignments.length > 0
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/30'
                  : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
              }`}
              title={
                dayAssignments.length > 0
                  ? `${dayAssignments.length} assignment${dayAssignments.length > 1 ? 's' : ''}`
                  : format(day, 'MMMM d, yyyy')
              }
            >
              <div>{format(day, 'd')}</div>
              {dayAssignments.length > 0 && (
                <div className="text-[10px] mt-1 font-bold">{dayAssignments.length}</div>
              )}
            </button>
          );
        })}
      </div>
      {size === 'large' && (
        <div className="pt-5 border-t border-gray-200 dark:border-white/10">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Upcoming This Month
          </div>
          <div className="space-y-2.5 max-h-32 overflow-y-auto">
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
                    className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course?.color || '#6366F1' }}
                    />
                    <span className="text-gray-900 dark:text-white font-bold flex-1 truncate">{assignment.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 font-semibold">{format(new Date(assignment.dueDate), 'MMM d')}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
