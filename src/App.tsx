import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { user, loading } = useAuth();

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

  // Update theme when user changes or loads preferences
  useEffect(() => {
    const updateThemeFromUser = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const theme = userData.preferences?.theme || localStorage.getItem('theme') || 'light';
            const root = document.documentElement;
            if (theme === 'dark') {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
            localStorage.setItem('theme', theme);
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      }
    };

    updateThemeFromUser();
  }, [user]);

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
        </Routes>
      )}
    </Router>
  );
}

export default App;


