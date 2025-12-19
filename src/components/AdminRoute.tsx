import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Component to protect admin routes
 * Redirects non-admin users to home page
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

