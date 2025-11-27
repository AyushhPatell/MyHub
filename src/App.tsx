import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { user, loading } = useAuth();

  // Initialize theme on app load
  useEffect(() => {
    const initializeTheme = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const theme = userData.preferences?.theme || 'light';
            applyTheme(theme);
          } else {
            // Default to light theme if no preferences
            applyTheme('light');
          }
        } catch (error) {
          console.error('Error loading theme:', error);
          applyTheme('light');
        }
      } else {
        // Apply light theme when not logged in
        applyTheme('light');
      }
    };

    const applyTheme = (theme: string) => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    initializeTheme();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={
            user ? (
              <Layout>
                <DashboardPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/courses"
          element={
            user ? (
              <Layout>
                <CoursesPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            user ? (
              <Layout>
                <CourseDetailPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            user ? (
              <Layout>
                <SettingsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

