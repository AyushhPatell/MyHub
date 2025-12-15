import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { accountService, semesterService } from '../services/firestore';
import { UserPreferences, Semester } from '../types';
import { Moon, Sun, Bell, Clock, Settings, Trash2, AlertTriangle, Calendar, Archive, RotateCcw, Plus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalContainer from '../components/ModalContainer';
import SemesterSetupModal from '../components/SemesterSetupModal';
import { applySmoothThemeTransition } from '../utils/themeTransition';

// Compact Scrollable Time Picker Component
function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [hours, minutes] = value.split(':').map(Number);
  const hoursValue = isNaN(hours) ? 18 : hours;
  const minutesValue = isNaN(minutes) ? 0 : minutes;

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to selected hour
    if (hoursRef.current) {
      const selectedElement = hoursRef.current.querySelector(`[data-value="${hoursValue}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [hoursValue]);

  useEffect(() => {
    // Scroll to selected minute
    if (minutesRef.current) {
      const selectedElement = minutesRef.current.querySelector(`[data-value="${minutesValue}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [minutesValue]);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = (type: 'hours' | 'minutes', container: HTMLDivElement) => {
    // Debounce scroll handling
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const items = container.querySelectorAll('[data-value]');
      let closestItem: HTMLElement | null = null;
      let closestDistance = Infinity;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const centerY = containerRect.top + containerRect.height / 2;
        const distance = Math.abs(rect.top + rect.height / 2 - centerY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = item as HTMLElement;
        }
      });

      if (closestItem) {
        const value = Number((closestItem as HTMLElement).dataset.value);
        if (type === 'hours') {
          const time = `${String(value).padStart(2, '0')}:${String(minutesValue).padStart(2, '0')}`;
          onChange(time);
        } else {
          const time = `${String(hoursValue).padStart(2, '0')}:${String(value).padStart(2, '0')}`;
          onChange(time);
        }
      }
    }, 150); // Debounce for 150ms
  };

  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 border border-gray-200 dark:border-gray-700">
      {/* Hours Picker */}
      <div className="flex-1 relative">
        <div
          ref={hoursRef}
          className="time-picker-scroll h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={(e) => handleScroll('hours', e.currentTarget)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="py-12">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                data-value={i}
                className={`snap-center h-8 flex items-center justify-center text-lg font-semibold transition-all cursor-pointer rounded-lg ${
                  hoursValue === i
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 scale-110'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => {
                  const time = `${String(i).padStart(2, '0')}:${String(minutesValue).padStart(2, '0')}`;
                  onChange(time);
                }}
              >
                {String(i).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        {/* Selection indicator overlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none border-t-2 border-b-2 border-primary-400 dark:border-primary-500 rounded-lg h-8 opacity-50"></div>
        {/* Gradient fade at top and bottom */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-800/50 pointer-events-none rounded-t-xl"></div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-800/50 pointer-events-none rounded-b-xl"></div>
      </div>

      <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>

      {/* Minutes Picker */}
      <div className="flex-1 relative">
        <div
          ref={minutesRef}
          className="time-picker-scroll h-32 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={(e) => handleScroll('minutes', e.currentTarget)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="py-12">
            {Array.from({ length: 60 }, (_, i) => (
              <div
                key={i}
                data-value={i}
                className={`snap-center h-8 flex items-center justify-center text-lg font-semibold transition-all cursor-pointer rounded-lg ${
                  minutesValue === i
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 scale-110'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => {
                  const time = `${String(hoursValue).padStart(2, '0')}:${String(i).padStart(2, '0')}`;
                  onChange(time);
                }}
              >
                {String(i).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        {/* Selection indicator overlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none border-t-2 border-b-2 border-primary-400 dark:border-primary-500 rounded-lg h-8 opacity-50"></div>
        {/* Gradient fade at top and bottom */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-800/50 pointer-events-none rounded-t-xl"></div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-800/50 pointer-events-none rounded-b-xl"></div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [archivedSemester, setArchivedSemester] = useState<Semester | null>(null);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [showSemesterSetup, setShowSemesterSetup] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
      loadSemesters();
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

  const loadSemesters = async () => {
    if (!user) return;
    try {
      setLoadingSemesters(true);
      const [active, archived] = await Promise.all([
        semesterService.getActiveSemester(user.uid),
        semesterService.getArchivedSemester(user.uid)
      ]);
      setCurrentSemester(active);
      setArchivedSemester(archived);
    } catch (error) {
      console.error('Error loading semesters:', error);
    } finally {
      setLoadingSemesters(false);
    }
  };

  const handleSwitchSemester = async (semesterId: string) => {
    if (!user) return;
    try {
      setSwitching(true);
      await semesterService.switchToSemester(user.uid, semesterId);
      await loadSemesters();
      // Reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error switching semester:', error);
      alert('Failed to switch semester. Please try again.');
    } finally {
      setSwitching(false);
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
    darkModeScheduleEnabled: false,
    darkModeScheduleType: 'time',
    darkModeScheduleTimeFrom: '18:00',
    darkModeScheduleTimeTo: '07:00',
  });

  const updatePreference = async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return;

    setSaving(true);
    try {
      const newPreferences = { ...preferences, ...updates };
      await updateDoc(doc(db, 'users', user.uid), { preferences: newPreferences });
      setPreferences(newPreferences);

      // Apply theme change immediately (but preserve state when switching to system)
      if (updates.theme) {
        const root = document.documentElement;
        
        if (updates.theme === 'system') {
          // When switching to system, preserve current theme state
          // Don't change theme - let OS preference or scheduler handle it
          localStorage.setItem('theme', 'system');
          
          // Only apply OS preference if scheduling is disabled
          if (!newPreferences.darkModeScheduleEnabled) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
          // If scheduling is enabled, scheduler will handle it
        } else if (updates.theme) {
          // Manual theme (light or dark) - apply with smooth transition
          const theme = updates.theme;
          const root = document.documentElement;
          const currentIsDark = root.classList.contains('dark');
          const willBeDark = theme === 'dark';
          
          if (currentIsDark !== willBeDark) {
            applySmoothThemeTransition(() => {
              applyTheme(theme);
            }, 400);
          } else {
            applyTheme(theme);
          }
        }
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
    // Update localStorage immediately so login/register pages pick it up
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      // For system theme, preserve current state if scheduling is disabled
      // Otherwise, use OS preference
      if (!preferences?.darkModeScheduleEnabled) {
        // Scheduling disabled - use OS preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } else {
        // Scheduling enabled - preserve current state, scheduler will handle it
        // Don't change theme here
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmText = 'DELETE';
    const userInput = prompt(
      `⚠️ WARNING: This will permanently delete your account and ALL your data.\n\n` +
      `This action cannot be undone. All your courses, assignments, notes, and settings will be permanently deleted.\n\n` +
      `Type "${confirmText}" to confirm:`
    );
    
    if (userInput !== confirmText) {
      return;
    }
    
    setDeleting(true);
    try {
      // Verify user is still authenticated
      if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
        throw new Error('User authentication required. Please sign in again.');
      }
      
      // Delete all Firestore data first
      await accountService.deleteUserAccount(user.uid);
      
      // Delete Firebase Auth user (requires recent authentication)
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (authError: any) {
          // If auth deletion fails, still sign out
          console.error('Error deleting auth user:', authError);
          if (authError.code !== 'auth/requires-recent-login') {
            throw authError;
          }
        }
      }
      
      // Sign out and redirect
      await signOut(auth);
      navigate('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please sign out and sign back in, then try deleting your account again.');
      } else if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Permission')) {
        alert('Permission denied. Please ensure:\n1. You are logged in\n2. Firestore security rules include "delete" permissions\n3. Rules have been published in Firebase Console\n\nSee UPDATED_FIRESTORE_RULES.txt for the correct rules.');
      } else {
        alert(`Failed to delete account: ${error.message || 'Unknown error'}. Please try again or contact support.`);
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
    <div className="min-h-screen w-full pb-safe">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-8">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-semibold">Manage your preferences</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 mb-8">
          {/* Semester Management */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Semester Management</h2>
            </div>
            {loadingSemesters ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSemester && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">Current Semester</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg">Active</span>
                    </div>
                    <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{currentSemester.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(currentSemester.startDate).toLocaleDateString()} - {new Date(currentSemester.endDate).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => setShowSemesterSetup(true)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Start New Semester
                    </button>
                  </div>
                )}
                
                {archivedSemester && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Archived Semester</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-bold bg-gray-600 text-white rounded-lg">Archived</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{archivedSemester.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(archivedSemester.startDate).toLocaleDateString()} - {new Date(archivedSemester.endDate).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleSwitchSemester(archivedSemester.id)}
                      disabled={switching}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {switching ? 'Switching...' : 'Switch to This Semester'}
                    </button>
                  </div>
                )}

                {!currentSemester && !archivedSemester && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No semesters found. Create your first semester from the Courses page.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Dashboard Widgets */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Widgets</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">Customize Widgets</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Arrange and configure your dashboard widgets</p>
                </div>
                <button
                  onClick={() => navigate('/?edit=true')}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-sm sm:text-base"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Edit Widgets</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              {preferences.theme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">Theme Mode</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose how theme is applied</p>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) => updatePreference({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">Auto (Scheduled)</option>
                </select>
              </div>

              {/* Dark Mode Scheduling */}
              {preferences.theme === 'system' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">Dark Mode Scheduling</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Automatically switch theme based on time or sunset/sunrise</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.darkModeScheduleEnabled || false}
                        onChange={(e) => updatePreference({ darkModeScheduleEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {preferences.darkModeScheduleEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Schedule Type
                        </label>
                        <select
                          value={preferences.darkModeScheduleType || 'time'}
                          onChange={(e) => updatePreference({ darkModeScheduleType: e.target.value as 'time' | 'sunset' | 'sunrise' })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="time">Custom Time</option>
                          <option value="sunset">Sunset</option>
                          <option value="sunrise">Sunset to Sunrise</option>
                        </select>
                      </div>

                      {preferences.darkModeScheduleType === 'time' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Dark Mode From
                            </label>
                            <TimePicker
                              value={preferences.darkModeScheduleTimeFrom || '18:00'}
                              onChange={(time) => updatePreference({ darkModeScheduleTimeFrom: time })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Light Mode From
                            </label>
                            <TimePicker
                              value={preferences.darkModeScheduleTimeTo || '07:00'}
                              onChange={(time) => updatePreference({ darkModeScheduleTimeTo: time })}
                            />
                          </div>
                        </div>
                      )}

                      {(preferences.darkModeScheduleType === 'sunset' || preferences.darkModeScheduleType === 'sunrise') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Location (for sunset/sunrise)
                          </label>
                          {preferences.darkModeScheduleLocation ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin size={16} />
                                <span>
                                  {preferences.darkModeScheduleLocation.lat.toFixed(4)}, {preferences.darkModeScheduleLocation.lng.toFixed(4)}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                      (position) => {
                                        updatePreference({
                                          darkModeScheduleLocation: {
                                            lat: position.coords.latitude,
                                            lng: position.coords.longitude,
                                          },
                                        });
                                      },
                                      (error) => {
                                        alert('Failed to get location. Please enable location permissions.');
                                        console.error('Geolocation error:', error);
                                      }
                                    );
                                  } else {
                                    alert('Geolocation is not supported by your browser.');
                                  }
                                }}
                                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm"
                              >
                                Update Location
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                if (navigator.geolocation) {
                                  navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                      updatePreference({
                                        darkModeScheduleLocation: {
                                          lat: position.coords.latitude,
                                          lng: position.coords.longitude,
                                        },
                                      });
                                    },
                                    (error) => {
                                      alert('Failed to get location. Please enable location permissions.');
                                      console.error('Geolocation error:', error);
                                    }
                                  );
                                } else {
                                  alert('Geolocation is not supported by your browser.');
                                }
                              }}
                              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm"
                            >
                              <MapPin className="w-4 h-4 inline mr-2" />
                              Use Current Location
                            </button>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {preferences.darkModeScheduleType === 'sunset'
                              ? 'Theme switches to dark mode at sunset each day.'
                              : 'Theme switches to dark mode at sunset and back to light at sunrise.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
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
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 dark:border-white/10">
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
                  className="w-full max-w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ 
                    width: '100%', 
                    maxWidth: '100%', 
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => updatePreference({ dateFormat: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' })}
                  className="w-full max-w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
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
                  className="w-full max-w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
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
                  className="w-full max-w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="bg-red-50 dark:bg-red-950/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-red-200 dark:border-red-900/50">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Danger Zone</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-red-800 dark:text-red-300 mb-4">
                  Once you delete your account, there is no going back. All your data including courses, assignments, notes, and settings will be permanently deleted.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition-colors shadow-lg text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  {deleting ? 'Deleting Account...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl shadow-lg font-semibold z-50">
          Saving...
        </div>
      )}

      {showDeleteConfirm && (
        <ModalContainer onClose={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full border-2 border-red-200 dark:border-red-900 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </ModalContainer>
      )}

      {showSemesterSetup && user && (
        <SemesterSetupModal
          userId={user.uid}
          onClose={() => setShowSemesterSetup(false)}
          onSuccess={() => {
            setShowSemesterSetup(false);
            loadSemesters();
            // Reload the page to refresh all data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

