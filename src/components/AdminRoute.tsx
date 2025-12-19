import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Component to protect admin routes
 * Redirects non-admin users to home page
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: loadingAuth } = useAuth();
  const { isAdmin, loading: loadingAdmin } = useIsAdmin();
  const [hasChecked, setHasChecked] = useState(false);

  // Wait for both auth and admin checks to complete
  useEffect(() => {
    if (!loadingAuth && !loadingAdmin) {
      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        setHasChecked(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadingAuth, loadingAdmin]);

  // Show loading while checking auth or admin status
  if (loadingAuth || loadingAdmin || !hasChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">
            Checking admin access...
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    console.warn('[AdminRoute] User not authenticated. Redirecting to login.');
    return <Navigate to="/login" replace />;
  }

  // Log admin status for debugging
  console.log('[AdminRoute] Admin check result:', {
    userId: user.uid,
    isAdmin,
    loadingAuth,
    loadingAdmin,
  });

  // If not admin, redirect to home
  if (!isAdmin) {
    console.warn(
      '[AdminRoute] User is not an admin. Redirecting to home.',
      { userId: user.uid, email: user.email }
    );
    return <Navigate to="/" replace />;
  }

  // User is admin, render children
  console.log('[AdminRoute] Admin access granted. Rendering dashboard.');
  return <>{children}</>;
}

