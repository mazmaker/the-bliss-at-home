/**
 * Admin Login Page
 * Port 3001 - For ADMIN role only
 */

import { AuthLayout, LoginForm } from '@bliss/ui'
import { APP_CONFIGS } from '@bliss/supabase/auth'

export function AdminLoginPage() {
  const config = APP_CONFIGS.ADMIN

  return (
    <AuthLayout
      appTitle={config.name}
      backgroundVariant="gradient"
      showBackLink={false}
    >
      <LoginForm
        appTitle={config.name}
        primaryColor={config.primaryColor}
        redirectTo={config.defaultPath}
        showRegister={false}
        showRememberMe={true}
      />
    </AuthLayout>
  )
}
