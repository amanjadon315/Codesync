import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-editor-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-editor-muted text-sm">Loading CodeSync…</span>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
