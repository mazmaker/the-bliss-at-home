/**
 * Admin Protected Route Component
 * Custom protected route for admin app that uses admin auth hook
 */

import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'

export interface AdminProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AdminProtectedRoute({
  children,
  redirectTo = '/admin/login',
}: AdminProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAdminAuth()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}