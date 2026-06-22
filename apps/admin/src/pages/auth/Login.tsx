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
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="The Bliss Massage at Home" className="h-24 w-24 object-contain" />
        </div>
        <AdminLoginForm
          appTitle={config.name}
          primaryColor={config.primaryColor}
          redirectTo={config.defaultPath}
        />
      </div>
    </div>
  )
}
