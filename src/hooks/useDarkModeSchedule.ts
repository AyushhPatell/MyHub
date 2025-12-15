import { useEffect, useRef } from 'react';
import { shouldBeDarkMode, getNextSwitchTime, DarkModeScheduleConfig } from '../utils/darkModeScheduler';
import { applySmoothThemeTransition } from '../utils/themeTransition';

/**
 * Hook to automatically manage dark mode based on schedule
 */
export function useDarkModeSchedule(config: DarkModeScheduleConfig | null, manualTheme: 'light' | 'dark' | 'system') {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If theme is not 'system', don't apply scheduling
    if (manualTheme !== 'system') {
      return;
    }

    // If scheduling is disabled or config is null, preserve current theme (don't change it)
    if (!config || !config.enabled) {
      // Don't change theme - preserve whatever is currently set
      return;
    }

    const applyScheduledTheme = () => {
      const root = document.documentElement;
      const currentIsDark = root.classList.contains('dark');
      const shouldBeDark = shouldBeDarkMode(config);

      // Only apply transition if theme is actually changing
      if (currentIsDark !== shouldBeDark) {
        applySmoothThemeTransition(() => {
          if (shouldBeDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }, 400);
      }
    };

    // Apply immediately
    applyScheduledTheme();

    // Schedule next check
    const scheduleNextCheck = () => {
      const nextSwitch = getNextSwitchTime(config);
      if (nextSwitch) {
        const delay = nextSwitch.getTime() - Date.now();
        if (delay > 0) {
          timeoutRef.current = setTimeout(() => {
            applyScheduledTheme();
            scheduleNextCheck();
          }, delay);
        }
      }
    };

    scheduleNextCheck();

    // Check every 10 seconds to catch time changes immediately
    // This ensures theme switches as soon as the scheduled time arrives
    intervalRef.current = setInterval(() => {
      applyScheduledTheme();
      // Re-schedule next check in case config changed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      scheduleNextCheck();
    }, 10000); // Check every 10 seconds for immediate switching

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [config, manualTheme]);
}

