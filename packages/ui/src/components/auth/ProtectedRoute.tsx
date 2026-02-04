/**
 * Protected Route Component
 * Wraps routes that require authentication
 *
 * DEV MODE: Auth is temporarily disabled for development
 * Set DISABLE_AUTH=false to enable authentication
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'
import Loader from '../Loader'

// DEV MODE: Set to false to enable authentication
const DISABLE_AUTH = false

export interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Required role to access this route
   * If not specified, any authenticated user can access
   */
  allowedRoles?: string[]
  /**
   * Redirect path if not authenticated
   */
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  // DEV MODE: Bypass all auth checks
  if (DISABLE_AUTH) {
    return <>{children}</>
  }

  const { user, isLoading } = useAuth()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
