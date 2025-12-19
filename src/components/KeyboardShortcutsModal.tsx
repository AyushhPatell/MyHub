import { X, Keyboard } from 'lucide-react';
import { useEffect } from 'react';
import ModalContainer from './ModalContainer';

const getShortcutDisplay = (shortcut: KeyboardShortcutDisplay): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push('Ctrl/Cmd');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

interface KeyboardShortcutDisplay {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'general';
}

const shortcuts: KeyboardShortcutDisplay[] = [
  {
    key: 'k',
    ctrl: true,
    meta: true,
    description: 'Open search',
    category: 'actions',
  },
  {
    key: 'n',
    ctrl: true,
    meta: true,
    description: 'Quick add assignment',
    category: 'actions',
  },
  {
    key: '/',
    ctrl: true,
    meta: true,
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
  {
    key: ',',
    ctrl: true,
    meta: true,
    description: 'Open settings',
    category: 'actions',
  },
  {
    key: 'd',
    ctrl: true,
    meta: true,
    description: 'Go to dashboard',
    category: 'navigation',
  },
];

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation');
  const actionShortcuts = shortcuts.filter((s) => s.category === 'actions');
  const generalShortcuts = shortcuts.filter((s) => s.category === 'general');

  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <ModalContainer onClose={onClose} backdropClassName="bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Press Esc to close
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Navigation */}
            {navigationShortcuts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Navigation
                </h3>
                <div className="space-y-2">
                  {navigationShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                        {getShortcutDisplay(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {actionShortcuts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Actions
                </h3>
                <div className="space-y-2">
                  {actionShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                        {getShortcutDisplay(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General */}
            {generalShortcuts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  General
                </h3>
                <div className="space-y-2">
                  {generalShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                        {getShortcutDisplay(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <p className="text-xs text-indigo-800 dark:text-indigo-200">
                <strong>Note:</strong> Shortcuts work globally when you're not typing in input fields. 
                On Mac, use ⌘ (Command) instead of Ctrl. On Windows/Linux, use Ctrl.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}

