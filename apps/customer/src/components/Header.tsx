import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Home, Briefcase, ClipboardList, User, Menu, X, Sparkles, LogOut, ChevronDown } from 'lucide-react'
import { authService } from '@bliss/supabase/auth'
import type { Profile } from '@bliss/supabase/auth'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const loadProfile = async () => {
    try {
      const userProfile = await authService.getCurrentProfile()
      setProfile(userProfile)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/services', label: 'Services', icon: Briefcase },
    { path: '/bookings', label: 'Bookings', icon: ClipboardList },
    { path: '/profile', label: 'Profile', icon: User },
  ]

  const IconComponent = ({ icon: Icon }: { icon: any }) => <Icon className="w-5 h-5" />

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">The Bliss at Home</h1>
              <p className="text-xs text-stone-500 hidden sm:block font-light tracking-wide">Massage • Spa • Nail</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 font-medium text-sm transition ${
                  isActive(item.path)
                    ? 'text-amber-700'
                    : 'text-stone-600 hover:text-amber-700'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoading && profile ? (
              <>
                {/* User Menu Dropdown */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-stone-700 hover:text-amber-700 font-medium text-sm transition px-3 py-2 rounded-lg hover:bg-stone-50"
                  >
                    <User className="w-4 h-4" />
                    <span>{displayName}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                      <Link
                        to="/bookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <ClipboardList className="w-4 h-4" />
                        My Bookings
                      </Link>
                      <div className="border-t border-stone-200 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/booking"
                  className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition shadow-md"
                >
                  Book Now
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition shadow-md"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-stone-200 pt-4">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                    isActive(item.path)
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <div className="border-t border-stone-200 pt-3 mt-3">
                {!isLoading && profile ? (
                  <>
                    <div className="px-4 py-2 text-xs text-stone-500 font-medium">
                      Signed in as
                    </div>
                    <div className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-50 rounded-lg mx-3 mb-3">
                      {displayName}
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-700 hover:bg-stone-100 mx-3"
                    >
                      <User className="w-5 h-5" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/booking"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 mt-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white px-4 py-3 rounded-xl font-medium shadow-md mx-3"
                    >
                      Book Now
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 w-full mt-3 mx-3"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 mt-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white px-4 py-3 rounded-xl font-medium shadow-md mx-3"
                  >
                    Login
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
