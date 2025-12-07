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
  medium: 'sm:col-span-2 col-span-1',
  large: 'sm:col-span-2 lg:col-span-3 col-span-1',
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
      className={`${sizeClasses[widget.size]} relative transition-all duration-200 ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
      } ${isDragOver ? 'ring-2 ring-indigo-500' : ''}`}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className={`relative bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 transition-all duration-200 h-full flex flex-col overflow-hidden w-full ${
          isEditMode
            ? 'ring-2 ring-indigo-300 dark:ring-indigo-500/50'
            : 'hover:border-indigo-300 dark:hover:border-indigo-500/30'
        } ${isDragOver ? 'ring-indigo-500 border-indigo-500' : ''}`}
      >
        {/* Edit Controls */}
        {isEditMode && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowSizeMenu(!showSizeMenu)}
                className="px-3 py-2 bg-white dark:bg-gray-800/80 backdrop-blur-xl text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors flex items-center gap-2 border border-gray-200 dark:border-white/10"
              >
                {sizeLabels[widget.size]}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSizeMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSizeMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-20 min-w-[120px] py-2">
                    {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleSizeChange(size)}
                        className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-bold ${
                          widget.size === size
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
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
            <button
              onClick={onRemove}
              className="p-2 bg-white dark:bg-gray-800/80 backdrop-blur-xl hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-colors text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-white/10"
              title="Remove widget"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Drag Handle - Only visible in edit mode */}
        {isEditMode && (
          <div className="absolute top-4 left-4 z-10 cursor-move">
            <GripVertical className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* Widget Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
