import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { accountService, semesterService } from '../services/firestore';
import { UserPreferences, Semester } from '../types';
import { Moon, Sun, Bell, Clock, Settings, Trash2, AlertTriangle, Calendar, Archive, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalContainer from '../components/ModalContainer';
import SemesterSetupModal from '../components/SemesterSetupModal';

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
    // Update localStorage immediately so login/register pages pick it up
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
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

