import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import { useDarkModeSchedule } from './hooks/useDarkModeSchedule';
import { UserPreferences } from './types';
import { applySmoothThemeTransition } from './utils/themeTransition';
// Email scheduling is now handled by Firebase Cloud Functions (backend)
// No need for frontend scheduler - emails are sent automatically even when app is closed

function App() {
  const { user, loading } = useAuth();
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Initialize theme immediately on app load (before user check)
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    };

    // Apply theme immediately from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
  }, []);

  // Load user preferences with real-time updates
  useEffect(() => {
    if (!user) {
      setUserPreferences(null);
      return;
    }

    // Use onSnapshot for real-time updates when preferences change
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const preferences = userData.preferences || {
            defaultDueTime: '23:59',
            theme: 'light',
            notificationsEnabled: true,
            emailDigestEnabled: false,
            emailDigestFrequency: 'none',
            timezone: 'America/Halifax',
            dateFormat: 'MM/DD/YYYY',
            firstDayOfWeek: 'Monday',
          };
          setUserPreferences(preferences as UserPreferences);

          // Apply theme based on preference
          const theme = preferences.theme || localStorage.getItem('theme') || 'light';
          const root = document.documentElement;
          
          if (theme === 'system') {
            // For system theme, check if scheduling is enabled
            if (preferences.darkModeScheduleEnabled) {
              // Scheduling will handle theme switching - preserve current state
              // The useDarkModeSchedule hook will apply the correct theme based on schedule
              // Don't change theme here, let the scheduler handle it
            } else {
              // System mode but scheduling disabled - use OS/browser preference
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (prefersDark) {
                root.classList.add('dark');
              } else {
                root.classList.remove('dark');
              }
            }
            localStorage.setItem('theme', theme);
            } else {
              // Manual theme (light or dark) - apply with smooth transition
              const currentIsDark = root.classList.contains('dark');
              const willBeDark = theme === 'dark';
              
              if (currentIsDark !== willBeDark) {
                applySmoothThemeTransition(() => {
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                }, 400);
              } else {
                if (theme === 'dark') {
                  root.classList.add('dark');
                } else {
                  root.classList.remove('dark');
                }
              }
              localStorage.setItem('theme', theme);
            }
        } else {
          // User document doesn't exist, set default preferences
          const defaultPreferences: UserPreferences = {
            defaultDueTime: '23:59',
            theme: 'light',
            notificationsEnabled: true,
            emailDigestEnabled: false,
            emailDigestFrequency: 'none',
            timezone: 'America/Halifax',
            dateFormat: 'MM/DD/YYYY',
            firstDayOfWeek: 'Monday',
          };
          setUserPreferences(defaultPreferences);
        }
      },
      (error) => {
        console.error('Error loading preferences:', error);
      }
    );

    // Cleanup subscription on unmount or user change
    return () => unsubscribe();
  }, [user]);

  // Use dark mode scheduler when theme is 'system'
  const scheduleConfig = userPreferences && userPreferences.theme === 'system' && userPreferences.darkModeScheduleEnabled
    ? {
        enabled: true,
        type: (userPreferences.darkModeScheduleType || 'time') as 'time' | 'sunset' | 'sunrise',
        timeFrom: userPreferences.darkModeScheduleTimeFrom,
        timeTo: userPreferences.darkModeScheduleTimeTo,
        location: userPreferences.darkModeScheduleLocation,
        timezone: userPreferences.timezone,
      }
    : null;

  useDarkModeSchedule(scheduleConfig, userPreferences?.theme || 'light');

  // Email scheduling is handled by Firebase Cloud Functions
  // Scheduled functions run automatically on the backend
  // No frontend scheduler needed anymore

  return (
    <Router>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      ) : (
        <Routes>
          <Route 
            path="/login" 
            element={
              !user ? (
                <PageTransition>
                  <LoginPage />
                </PageTransition>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              !user ? (
                <PageTransition>
                  <RegisterPage />
                </PageTransition>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route
            path="/"
            element={
              user ? (
                <Layout>
                  <PageTransition>
                    <DashboardPage />
                  </PageTransition>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/courses"
            element={
              user ? (
                <Layout>
                  <PageTransition>
                    <CoursesPage />
                  </PageTransition>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              user ? (
                <Layout>
                  <PageTransition>
                    <CourseDetailPage />
                  </PageTransition>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              user ? (
                <Layout>
                  <PageTransition>
                    <SettingsPage />
                  </PageTransition>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              user ? (
                <Layout>
                  <PageTransition>
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  </PageTransition>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      )}
    </Router>
  );
}

export default App;


