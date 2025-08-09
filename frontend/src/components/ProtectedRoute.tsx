import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Afișăm loading până când verificăm autentificarea
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirecționăm la login dacă nu este autentificat, păstrând url-ul curent în state
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Afișează rutele copil dacă utilizatorul este autentificat
  return <Outlet />;
};

export default ProtectedRoute;