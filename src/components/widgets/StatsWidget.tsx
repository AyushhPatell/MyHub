import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Assignment } from '../../types';
import { getTodayRange, getWeekRange } from '../../utils/dateHelpers';

interface StatsWidgetProps {
  size: 'small' | 'medium' | 'large';
  assignments: Assignment[];
  onStatClick?: (type: 'today' | 'week' | 'overdue') => void;
}

export default function StatsWidget({ size, assignments, onStatClick }: StatsWidgetProps) {
  const todayRange = getTodayRange();
  const weekRange = getWeekRange();

  const todayAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= todayRange.start && dueDate <= todayRange.end;
  });

  const weekAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    const dueDate = new Date(a.dueDate);
    return dueDate >= weekRange.start && dueDate <= weekRange.end;
  });

  const overdueAssignments = assignments.filter((a) => {
    if (a.completedAt) return false;
    return new Date(a.dueDate) < todayRange.start;
  });

  const colorClasses = {
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-600 dark:text-amber-400',
    },
  };

  const stats = [
    {
      label: 'Due Today',
      count: todayAssignments.length,
      icon: Calendar,
      color: 'red' as const,
      type: 'today' as const,
    },
    {
      label: 'This Week',
      count: weekAssignments.length,
      icon: Clock,
      color: 'amber' as const,
      type: 'week' as const,
    },
    {
      label: 'Overdue',
      count: overdueAssignments.length,
      icon: AlertCircle,
      color: 'red' as const,
      type: 'overdue' as const,
    },
  ];

  if (size === 'small') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.type}
              onClick={() => onStatClick?.(stat.type)}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all text-left group"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 ${colorClasses[stat.color].bg} rounded-lg flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${colorClasses[stat.color].text}`} />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.count}</div>
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.type}
              onClick={() => onStatClick?.(stat.type)}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                </div>
                <div className={`w-12 h-12 ${colorClasses[stat.color].bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm`}>
                  <Icon className={`w-6 h-6 ${colorClasses[stat.color].text}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Large size - same as medium but with more spacing
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.type}
            onClick={() => onStatClick?.(stat.type)}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {stat.label}
                </p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
              </div>
              <div className={`w-14 h-14 ${colorClasses[stat.color].bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm`}>
                <Icon className={`w-7 h-7 ${colorClasses[stat.color].text}`} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

