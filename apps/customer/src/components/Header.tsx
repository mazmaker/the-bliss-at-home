import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Home, Briefcase, ClipboardList, User, Menu, X, Sparkles } from 'lucide-react'

function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

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
            <Link
              to="/profile"
              className="flex items-center gap-2 text-stone-700 hover:text-amber-700 font-medium text-sm transition"
            >
              <User className="w-4 h-4" />
              <span>Somchai</span>
            </Link>
            <Link
              to="/bookings"
              className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition shadow-md"
            >
              Book Now
            </Link>
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
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-700 hover:bg-stone-100"
                >
                  <User className="w-5 h-5" />
                  <span>Somchai</span>
                </Link>
                <Link
                  to="/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 mt-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white px-4 py-3 rounded-xl font-medium shadow-md"
                >
                  Book Now
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
