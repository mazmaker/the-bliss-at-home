/**
 * Staff Registration Page
 * Port 3004 - For STAFF role
 *
 * This page handles direct access to /staff/register?token=xxx
 * (e.g., when someone opens the invite link in a regular browser).
 * It simply redirects to /staff/login?token=xxx where the actual
 * token validation and LINE login happens.
 *
 * When accessed via LIFF, the token is passed directly to Login.tsx
 * through LIFF URL params, so this page is mainly a fallback.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function StaffRegisterPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    if (token) {
      // Redirect to login page with token preserved
      navigate(`/staff/login?token=${token}`, { replace: true })
    } else {
      // No token — regular access, just go to login
      navigate('/staff/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 text-center">
        <p className="text-stone-600">กำลังนำทาง...</p>
      </div>
    </div>
  )
}

export default StaffRegisterPage
