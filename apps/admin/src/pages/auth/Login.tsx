/**
 * Admin Login Page
 * Port 3001 - For ADMIN role only
 */

import { AdminLoginForm } from '../../components/AdminLoginForm'
import { APP_CONFIGS } from '@bliss/supabase/auth'

export function AdminLoginPage() {
  const config = APP_CONFIGS.ADMIN

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AdminLoginForm
        appTitle={config.name}
        primaryColor={config.primaryColor}
        redirectTo={config.defaultPath}
      />
    </div>
  )
}
