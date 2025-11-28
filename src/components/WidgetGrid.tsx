import { useState, useEffect, useRef } from 'react';
import { Settings, Plus, LayoutGrid } from 'lucide-react';
import { WidgetConfig, DashboardLayout, WidgetType } from '../types';
import { widgetService } from '../services/firestore';
import WidgetContainer from './WidgetContainer';
import WeatherWidget from './widgets/WeatherWidget';
import QuickNotesWidget from './widgets/QuickNotesWidget';
import CalendarWidget from './widgets/CalendarWidget';
import StatsWidget from './widgets/StatsWidget';
import { Assignment, Course } from '../types';
import WidgetPickerModal from './WidgetPickerModal';

interface WidgetGridProps {
  userId: string;
  assignments: Assignment[];
  courses: Course[];
  onStatClick?: (type: 'today' | 'week' | 'overdue') => void;
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'stats', type: 'stats', size: 'medium', position: 0, visible: true },
  { id: 'weather', type: 'weather', size: 'small', position: 1, visible: true },
  { id: 'calendar', type: 'calendar', size: 'medium', position: 2, visible: true },
  { id: 'notes', type: 'notes', size: 'medium', position: 3, visible: true },
];

export default function WidgetGrid({ userId, assignments, courses, onStatClick }: WidgetGridProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    loadLayout();
  }, [userId]);

  const loadLayout = async () => {
    try {
      setLoading(true);
      const savedLayout = await widgetService.getDashboardLayout(userId);
      if (savedLayout) {
        setLayout(savedLayout);
      } else {
        // Create default layout
        const defaultLayout: DashboardLayout = {
          userId,
          widgets: defaultWidgets,
          updatedAt: new Date(),
        };
        await widgetService.saveDashboardLayout(userId, defaultLayout);
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.error('Error loading widget layout:', error);
      // Fallback to default layout
      const defaultLayout: DashboardLayout = {
        userId,
        widgets: defaultWidgets,
        updatedAt: new Date(),
      };
      setLayout(defaultLayout);
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async (updatedLayout: DashboardLayout) => {
    setLayout(updatedLayout);
    try {
      await widgetService.saveDashboardLayout(userId, updatedLayout);
    } catch (error) {
      console.error('Error saving widget layout:', error);
    }
  };

  const handleWidgetUpdate = async (widgetId: string, updates: Partial<WidgetConfig>) => {
    if (!layout) return;
    
    const updatedWidgets = layout.widgets.map((w) =>
      w.id === widgetId ? { ...w, ...updates } : w
    );
    
    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: updatedWidgets,
      updatedAt: new Date(),
    };
    
    await saveLayout(updatedLayout);
  };

  const handleWidgetRemove = async (widgetId: string) => {
    if (!layout) return;
    
    const updatedWidgets = layout.widgets.filter((w) => w.id !== widgetId);
    
    // Reorder positions
    const reorderedWidgets = updatedWidgets.map((w, index) => ({
      ...w,
      position: index,
    }));
    
    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: reorderedWidgets,
      updatedAt: new Date(),
    };
    
    await saveLayout(updatedLayout);
  };

  const handleAddWidget = async (widgetType: WidgetType) => {
    if (!layout) return;
    
    const newWidget: WidgetConfig = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      size: widgetType === 'stats' ? 'medium' : 'small',
      position: layout.widgets.length,
      visible: true,
    };
    
    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: [...layout.widgets, newWidget],
      updatedAt: new Date(),
    };
    
    await saveLayout(updatedLayout);
    setShowWidgetPicker(false);
  };

  const handleDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== widgetId) {
      setDragOverId(widgetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    
    if (!layout || !draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      return;
    }

    const widgets = [...layout.widgets];
    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidgetId);
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidgetId(null);
      return;
    }

    // Reorder widgets
    const [draggedWidget] = widgets.splice(draggedIndex, 1);
    widgets.splice(targetIndex, 0, draggedWidget);

    // Update positions
    const reorderedWidgets = widgets.map((w, index) => ({
      ...w,
      position: index,
    }));

    const updatedLayout: DashboardLayout = {
      ...layout,
      widgets: reorderedWidgets,
      updatedAt: new Date(),
    };

    await saveLayout(updatedLayout);
    setDraggedWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverId(null);
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'weather':
        return <WeatherWidget size={widget.size} location={widget.settings?.location} />;
      case 'notes':
        return <QuickNotesWidget size={widget.size} userId={userId} />;
      case 'calendar':
        return (
          <CalendarWidget
            size={widget.size}
            assignments={assignments}
            courses={courses}
          />
        );
      case 'stats':
        return (
          <StatsWidget
            size={widget.size}
            assignments={assignments}
            onStatClick={onStatClick}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!layout) return null;

  const visibleWidgets = layout.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position);

  const availableWidgetTypes: WidgetType[] = ['stats', 'weather', 'calendar', 'notes'];
  const usedWidgetTypes = new Set(visibleWidgets.map((w) => w.type));
  const unusedWidgetTypes = availableWidgetTypes.filter((type) => !usedWidgetTypes.has(type));

  return (
    <div className="space-y-4">
      {/* Header with Edit Mode Toggle and Add Widget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditMode && (
            <button
              onClick={() => setShowWidgetPicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </button>
          )}
        </div>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isEditMode
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          {isEditMode ? 'Done' : 'Edit Layout'}
        </button>
      </div>

      {/* Widget Grid */}
      {visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleWidgets.map((widget) => (
            <WidgetContainer
              key={widget.id}
              widget={widget}
              onUpdate={(updates) => handleWidgetUpdate(widget.id, updates)}
              onRemove={() => handleWidgetRemove(widget.id)}
              isEditMode={isEditMode}
              isDragging={draggedWidgetId === widget.id}
              isDragOver={dragOverId === widget.id}
              onDragStart={() => handleDragStart(widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget.id)}
              onDragEnd={handleDragEnd}
            >
              {renderWidget(widget)}
            </WidgetContainer>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Widgets Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            Add widgets to customize your dashboard. Click "Edit Layout" to get started.
          </p>
          <button
            onClick={() => {
              setIsEditMode(true);
              setShowWidgetPicker(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Your First Widget
          </button>
        </div>
      )}

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <WidgetPickerModal
          availableWidgets={unusedWidgetTypes}
          onSelect={handleAddWidget}
          onClose={() => setShowWidgetPicker(false)}
        />
      )}
    </div>
  );
}
