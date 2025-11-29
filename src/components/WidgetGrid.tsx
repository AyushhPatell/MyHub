import { useState, useEffect } from 'react';
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
  onCalendarDateClick?: (date: Date, assignments: Assignment[]) => void;
  initialEditMode?: boolean;
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'stats', type: 'stats', size: 'medium', position: 0, visible: true },
  { id: 'weather', type: 'weather', size: 'small', position: 1, visible: true },
  { id: 'calendar', type: 'calendar', size: 'medium', position: 2, visible: true },
  { id: 'notes', type: 'notes', size: 'medium', position: 3, visible: true },
];

export default function WidgetGrid({ userId, assignments, courses, onStatClick, onCalendarDateClick, initialEditMode = false }: WidgetGridProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
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
    // Prevent scrolling while dragging
    document.body.style.overflow = 'hidden';
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

    const [draggedWidget] = widgets.splice(draggedIndex, 1);
    widgets.splice(targetIndex, 0, draggedWidget);

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
    // Re-enable scrolling after drag ends
    document.body.style.overflow = '';
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
            onDateClick={(date, dayAssignments) => {
              if (onCalendarDateClick) {
                onCalendarDateClick(date, dayAssignments);
              }
            }}
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
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
    <div className="space-y-6">
      {/* Modern Controls - Only show in edit mode */}
      {isEditMode && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setShowWidgetPicker(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Widget
          </button>
          <button
            onClick={() => setIsEditMode(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <Settings className="w-5 h-5" />
            Done
          </button>
        </div>
      )}

      {/* Widget Grid */}
      {visibleWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
            <LayoutGrid className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">No Widgets</h3>
          <p className="text-lg text-gray-300 mb-10 text-center max-w-md font-medium">
            Add widgets to customize your dashboard
          </p>
          <button
            onClick={() => {
              setIsEditMode(true);
              setShowWidgetPicker(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl hover:scale-105 transition-transform shadow-xl"
          >
            <Plus className="w-6 h-6" />
            Add Widget
          </button>
        </div>
      )}

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
