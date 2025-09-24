import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Special handling for CLIENT users
  if (user.role === 'CLIENT') {
    // If CLIENT is trying to access dashboard, redirect to profile
    if (location.pathname === '/dashboard' || location.pathname === '/') {
      return <Navigate to="/profile" replace />;
    }

    // If CLIENT is trying to access admin/manager pages, redirect to profile
    if (requiredRoles.length > 0 && !requiredRoles.includes('CLIENT')) {
      return <Navigate to="/profile" replace />;
    }
  }

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // Non-client users trying to access client-only pages go to dashboard
    if (user.role !== 'CLIENT') {
      return <Navigate to="/dashboard" replace />;
    }
    // Client users trying to access restricted pages go to profile
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
