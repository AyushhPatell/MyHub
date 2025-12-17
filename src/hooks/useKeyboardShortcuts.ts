import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'general';
}

interface UseKeyboardShortcutsOptions {
  onQuickAdd?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcutsHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onQuickAdd,
  onOpenSettings,
  onOpenShortcutsHelp,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      meta: true,
      action: () => {
        // Search is handled by SearchBar component - trigger click on search button
        const searchButton = document.querySelector('button[title*="Search"], button[title*="⌘K"], button[title*="Ctrl+K"]') as HTMLButtonElement;
        if (searchButton) {
          searchButton.click();
        }
      },
      description: 'Open search',
      category: 'actions',
    },
    {
      key: 'n',
      ctrl: true,
      meta: true,
      action: () => {
        if (onQuickAdd) {
          onQuickAdd();
        }
      },
      description: 'Quick add assignment',
      category: 'actions',
    },
    {
      key: '/',
      ctrl: true,
      meta: true,
      action: () => {
        if (onOpenShortcutsHelp) {
          onOpenShortcutsHelp();
        }
      },
      description: 'Show keyboard shortcuts',
      category: 'general',
    },
    {
      key: ',',
      ctrl: true,
      meta: true,
      action: () => {
        if (onOpenSettings) {
          onOpenSettings();
        }
      },
      description: 'Open settings',
      category: 'actions',
    },
    {
      key: 'd',
      ctrl: true,
      meta: true,
      action: () => {
        navigate('/');
      },
      description: 'Go to dashboard',
      category: 'navigation',
    },
    {
      key: 'c',
      ctrl: true,
      meta: true,
      action: () => {
        navigate('/courses');
      },
      description: 'Go to courses',
      category: 'navigation',
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      // Special handling for Ctrl+C (copy) - only navigate if not in input
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (isInput) {
          return; // Allow default copy behavior
        }
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const metaMatch = shortcut.meta ? event.metaKey || event.ctrlKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          // For Ctrl/Cmd combinations, prevent default browser behavior
          if (shortcut.ctrl || shortcut.meta) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return shortcuts;
}

// Export shortcut definitions for the help modal
export const getShortcutDisplay = (shortcut: KeyboardShortcut, isMac: boolean): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
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

export const isMac = (): boolean => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

