import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase/auth'

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    let cancelled = false

    const handleCallback = async () => {
      try {
        console.log('=== OAuth Callback Started ===')

        // Check for error in URL first
        const searchParams = new URLSearchParams(window.location.search)
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('OAuth Error:', error)
          console.error('Error Description:', errorDescription)
          throw new Error(errorDescription || 'OAuth authentication failed')
        }

        // Supabase automatically handles the OAuth callback
        // Just wait a bit for it to process and get the session
        setStatus('Completing sign in...')

        // Give Supabase a moment to process the callback
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (cancelled) return

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }

        if (!session) {
          console.error('No session found after callback')
          throw new Error('Authentication failed - no session created')
        }

        const user = session.user
        console.log('User authenticated:', user.id, user.email)

        // Check if profile exists
        setStatus('Setting up your account...')
        let profile = await authService.getCurrentProfile()

        // Create profile if it doesn't exist
        if (!profile) {
          console.log('Creating profile for OAuth user...')

          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.user_metadata?.first_name ||
                        user.email?.split('@')[0] ||
                        'Facebook User',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            })
            .select()
            .single()

          if (profileError) {
            // If duplicate key error, profile already exists - try to fetch it again
            if (profileError.code === '23505') {
              console.log('Profile already exists, fetching...')
              await new Promise(resolve => setTimeout(resolve, 500))

              // Try fetching with direct query (bypass getCurrentProfile)
              const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

              if (fetchError || !existingProfile) {
                console.error('Failed to fetch existing profile:', fetchError)
                throw new Error('Profile exists but cannot be accessed')
              }

              profile = existingProfile
            } else {
              console.error('Profile creation error:', profileError)
              throw new Error('Failed to create profile: ' + profileError.message)
            }
          } else {
            profile = newProfile
          }
        }

        console.log('Profile ready:', profile)

        // Validate role
        if (profile.role !== 'CUSTOMER') {
          console.error('Invalid role for customer app:', profile.role)
          await supabase.auth.signOut()
          navigate('/login?error=invalid_role', { replace: true })
          return
        }

        // Validate status
        if (profile.status !== 'ACTIVE' && profile.status !== 'PENDING_VERIFICATION') {
          console.error('Account not active:', profile.status)
          await supabase.auth.signOut()
          navigate('/login?error=account_inactive', { replace: true })
          return
        }

        // Success
        setStatus('Success! Redirecting...')
        await new Promise(resolve => setTimeout(resolve, 300))
        navigate('/', { replace: true })

      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('Authentication failed')
        await new Promise(resolve => setTimeout(resolve, 1000))
        navigate('/login?error=oauth_failed', { replace: true })
      }
    }

    handleCallback()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mb-4"></div>
        <p className="text-stone-600 font-medium">{status}</p>
        <p className="text-stone-500 text-sm mt-2">Please wait a moment</p>
      </div>
    </div>
  )
}
