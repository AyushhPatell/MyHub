import { useState } from 'react';
import { WidgetConfig, WidgetSize } from '../types';
import { GripVertical, X, ChevronDown } from 'lucide-react';

interface WidgetContainerProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  onUpdate: (updates: Partial<WidgetConfig>) => void;
  onRemove: () => void;
  isEditMode?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-2',
  large: 'col-span-3',
};

const sizeLabels: Record<WidgetSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export default function WidgetContainer({
  widget,
  children,
  onUpdate,
  onRemove,
  isEditMode = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: WidgetContainerProps) {
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const handleSizeChange = (newSize: WidgetSize) => {
    onUpdate({ size: newSize });
    setShowSizeMenu(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', widget.id);
    onDragStart();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e);
  };

  if (!widget.visible) return null;

  return (
    <div
      className={`${sizeClasses[widget.size]} relative transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all h-full flex flex-col shadow-sm hover:shadow-md ${
          isEditMode
            ? 'border-primary-300 dark:border-primary-700 cursor-move'
            : 'border-gray-200 dark:border-gray-700'
        } ${isDragOver ? 'border-primary-500 dark:border-primary-500' : ''}`}
      >
        {/* Widget Header - Only show in edit mode */}
        {isEditMode && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="capitalize font-medium">{widget.type}</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Size Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSizeMenu(!showSizeMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Change size"
                >
                  {sizeLabels[widget.size]}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSizeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSizeMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[100px]">
                      {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(size)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            widget.size === size
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {sizeLabels[size]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Remove Button */}
              <button
                onClick={onRemove}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
                title="Remove widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Widget Content */}
        <div className="flex-1 p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
