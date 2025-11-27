import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserPreferences } from '../types';
import { Moon, Sun, Bell, Clock } from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function SettingsPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPreferences(userData.preferences || getDefaultPreferences());
      } else {
        setPreferences(getDefaultPreferences());
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = (): UserPreferences => ({
    defaultDueTime: '23:59',
    theme: 'light',
    notificationsEnabled: true,
    emailDigestEnabled: false,
    emailDigestFrequency: 'none',
    timezone: 'America/Halifax',
    dateFormat: 'MM/DD/YYYY',
    firstDayOfWeek: 'Monday',
  });

  const updatePreference = async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return;

    setSaving(true);
    try {
      const newPreferences = { ...preferences, ...updates };
      await updateDoc(doc(db, 'users', user.uid), { preferences: newPreferences });
      setPreferences(newPreferences);

      // Apply theme change immediately
      if (updates.theme) {
        applyTheme(updates.theme);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Don't apply theme here - it's handled in App.tsx
  // This prevents theme from changing when navigating to Settings page

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your preferences</p>
        </div>
        <div className="hidden lg:block">
          <SearchBar />
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-gray-200 dark:border-gray-700"></div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          {preferences.theme === 'dark' ? (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Theme</span>
            <button
              onClick={() => {
                const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
                updatePreference({ theme: newTheme });
              }}
              className="flex items-center justify-center w-14 h-8 rounded-full bg-gray-200 dark:bg-gray-700 relative transition-colors"
              title={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <div
                className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-md transform transition-transform flex items-center justify-center ${
                  preferences.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {preferences.theme === 'dark' ? (
                  <Moon size={14} className="text-gray-700" />
                ) : (
                  <Sun size={14} className="text-amber-500" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-gray-700 dark:text-gray-300">Enable Notifications</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about upcoming deadlines</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={(e) => updatePreference({ notificationsEnabled: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Time Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Time & Date</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Due Time
            </label>
            <input
              type="time"
              value={preferences.defaultDueTime}
              onChange={(e) => updatePreference({ defaultDueTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => updatePreference({ dateFormat: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Day of Week
            </label>
            <select
              value={preferences.firstDayOfWeek}
              onChange={(e) => updatePreference({ firstDayOfWeek: e.target.value as 'Sunday' | 'Monday' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <input
              type="text"
              value={preferences.timezone}
              onChange={(e) => updatePreference({ timezone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}

