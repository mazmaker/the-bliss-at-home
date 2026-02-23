# Admin App - The Bliss Massage at Home

## 🎯 Overview

Admin dashboard for managing The Bliss Massage at Home platform.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:3001

## 🔐 Authentication

### Development Mode (Mock Auth)

Set in `.env.local`:
```env
VITE_USE_MOCK_AUTH=true
```

Login with:
- Email: `admin@theblissathome.com`
- Password: `admin123456`

### Production Mode (Real Auth)

Set in `.env.local`:
```env
VITE_USE_MOCK_AUTH=false
```

Login with:
- Email: `admin2@theblissathome.com`
- Password: `AdminBliss2026!`

Note: Original admin@theblissathome.com has authentication issues. Use admin2 instead.

## 📁 Project Structure

```
apps/admin/
├── src/
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Layout components
│   ├── lib/            # Utilities and helpers
│   ├── pages/          # Page components
│   └── scripts/        # Utility scripts
├── public/             # Static assets
└── index.html          # Entry HTML
```

## 🛠️ Scripts

```bash
# Development
pnpm dev              # Start dev server (port 3001)
pnpm build            # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm typecheck        # Check TypeScript types
pnpm lint             # Run ESLint

# Admin User
pnpm create-admin     # Create admin user (requires SUPABASE_SERVICE_ROLE_KEY)
```

## 🎨 Features

- **Dashboard** - Overview of key metrics
- **Services Management** - Add/edit/remove services
- **Staff Management** - Manage service providers
- **Customer Management** - View customer information
- **Hotel Management** - Manage partner hotels
- **Booking Management** - View and manage bookings
- **Reports** - Analytics and reports
- **Settings** - System configuration

## 🔧 Environment Variables

Create `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://rbdvlfriqjnwpxmmgisf.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_APP_NAME=The Bliss Massage at Home - Admin
VITE_APP_PORT=3001

# Authentication Mode
VITE_USE_MOCK_AUTH=false  # true for mock, false for real auth
```

## 📱 Responsive Design

- Desktop-first design
- Tablet responsive
- Mobile friendly with collapsible sidebar

## 🎨 Design System

- **Colors**: Brown/Amber theme (Spa/Massage aesthetic)
- **Typography**: Clean and professional
- **Components**: Based on custom UI components
- **Icons**: Lucide React icons

## 🔒 Security

- Protected routes with role-based access
- Supabase Row Level Security (RLS)
- Secure authentication flow
- Admin-only access

## 🐛 Troubleshooting

### Cannot login
1. Check if `VITE_USE_MOCK_AUTH` is set correctly
2. For real auth, ensure admin user is created
3. Check browser console for errors

### Page not loading
1. Check if all dependencies are installed: `pnpm install`
2. Clear browser cache
3. Check if port 3001 is available

### Build errors
1. Run `pnpm typecheck` to find type errors
2. Check for missing imports
3. Ensure all environment variables are set

## 📝 License

Private - The Bliss Massage at Home © 2026