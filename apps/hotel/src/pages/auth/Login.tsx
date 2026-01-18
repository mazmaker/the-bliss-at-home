/**
 * Hotel Login Page
 * Port 3003 - For HOTEL role
 */

import { AuthLayout, LoginForm } from '@bliss/ui'
import { APP_CONFIGS } from '@bliss/supabase/auth'

export function HotelLoginPage() {
  const config = APP_CONFIGS.HOTEL

  return (
    <AuthLayout
      appTitle={config.name}
      backgroundVariant="gradient"
      backLinkText="Back to Home"
      backLinkTo="/"
    >
      <LoginForm
        appTitle={config.name}
        primaryColor={config.primaryColor}
        redirectTo={config.defaultPath}
        showRegister={false}
        showForgotPassword={true}
        showRememberMe={true}
      />
    </AuthLayout>
  )
}
