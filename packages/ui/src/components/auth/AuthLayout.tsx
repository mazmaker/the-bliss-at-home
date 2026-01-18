/**
 * Shared Auth Layout Component
 * Provides consistent layout for login/register pages
 */

import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface AuthLayoutProps {
  children: ReactNode
  /**
   * App-specific configuration
   */
  appTitle: string
  appLogo?: string
  showBackLink?: boolean
  backLinkText?: string
  backLinkTo?: string
  backgroundVariant?: 'default' | 'gradient' | 'image'
}

export function AuthLayout({
  children,
  appTitle,
  appLogo,
  showBackLink = true,
  backLinkText = 'Back to Home',
  backLinkTo = '/',
  backgroundVariant = 'default',
}: AuthLayoutProps) {
  const backgroundStyles = {
    default: 'bg-gray-50',
    gradient: 'bg-gradient-to-br from-gray-50 to-gray-100',
    image: 'bg-gray-900',
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${backgroundStyles[backgroundVariant]}`}
    >
      {/* Back Link */}
      {showBackLink && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
          <Link
            to={backLinkTo}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {backLinkText}
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          {appLogo && (
            <img
              src={appLogo}
              alt={appTitle}
              className="h-12 w-auto mx-auto mb-4"
            />
          )}
          <h2 className="text-3xl font-extrabold text-gray-900">
            {appTitle}
          </h2>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {appTitle}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
