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

  const stats = [
    {
      label: 'Due Today',
      count: todayAssignments.length,
      icon: Calendar,
      gradient: 'from-indigo-500 to-purple-500',
      type: 'today' as const,
    },
    {
      label: 'This Week',
      count: weekAssignments.length,
      icon: Clock,
      gradient: 'from-pink-500 to-rose-500',
      type: 'week' as const,
    },
    {
      label: 'Overdue',
      count: overdueAssignments.length,
      icon: AlertCircle,
      gradient: 'from-red-500 to-orange-500',
      type: 'overdue' as const,
    },
  ];

  if (size === 'small') {
    return (
      <div className="space-y-2.5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.type}
              onClick={() => onStatClick?.(stat.type)}
              className="w-full group relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-3 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">{stat.count}</div>
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Medium and Large - Compact horizontal layout optimized for all screens
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.type}
            onClick={() => onStatClick?.(stat.type)}
            className="group relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-2.5 sm:p-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2.5">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br ${stat.gradient} rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg`}>
                <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent leading-none">{stat.count}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">
                  {stat.label}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
