import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Guards a route by role.
 * - If not authenticated → /login
 * - If authenticated but wrong role → /unauthorized
 * - allowedRoles is optional; if omitted, any authenticated user passes
 */
export function RequireAuth({ children, allowedRoles }) {
  const { isAuthenticated, isLoaded, user } = useAuth();
  const location = useLocation();

  if (!isLoaded) return null; // Wait for session restore

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
