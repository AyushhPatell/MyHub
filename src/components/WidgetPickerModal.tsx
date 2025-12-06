import { X, Calendar, Cloud, StickyNote, BarChart3 } from 'lucide-react';
import { WidgetType } from '../types';

interface WidgetPickerModalProps {
  availableWidgets: WidgetType[];
  onSelect: (widgetType: WidgetType) => void;
  onClose: () => void;
}

const widgetInfo: Record<WidgetType, { name: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  stats: {
    name: 'Assignment Stats',
    description: 'View due today, this week, and overdue assignments',
    icon: BarChart3,
  },
  weather: {
    name: 'Weather',
    description: 'Current weather and forecast',
    icon: Cloud,
  },
  calendar: {
    name: 'Calendar',
    description: 'Monthly calendar with assignment due dates',
    icon: Calendar,
  },
  notes: {
    name: 'Quick Notes',
    description: 'Create and manage quick notes',
    icon: StickyNote,
  },
};

export default function WidgetPickerModal({ availableWidgets, onSelect, onClose }: WidgetPickerModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (availableWidgets.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Widget</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">All available widgets are already added to your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableWidgets.map((widgetType) => {
              const info = widgetInfo[widgetType];
              const Icon = info.icon;
              return (
                <button
                  key={widgetType}
                  onClick={() => onSelect(widgetType)}
                  className="flex items-start gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{info.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

