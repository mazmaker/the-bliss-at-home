/**
 * Authentication Types for The Bliss at Home
 * Shared across all 4 applications
 */

// User roles from database
export type UserRole = 'ADMIN' | 'CUSTOMER' | 'HOTEL' | 'STAFF'

// User status from database
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'

// Profile from profiles table
export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name?: string
  phone?: string
  avatar_url?: string
  status: UserStatus
  language: string
  created_at: string
  updated_at: string
}

// Auth state
export interface AuthState {
  user: Profile | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Login credentials
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

// Register credentials
export interface RegisterCredentials {
  email: string
  password: string
  fullName: string
  phone: string
  role: UserRole
}

// LINE Login credentials
export interface LineLoginCredentials {
  lineUserId: string
  displayName: string
  pictureUrl?: string
  accessToken?: string
}

// Auth response
export interface AuthResponse {
  profile: Profile
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

// Route config for role-based access
export interface RouteConfig {
  [key: string]: {
    allowedRoles: UserRole[]
    redirectTo: string
  }
}

// App-specific auth config
export interface AppConfig {
  name: string
  port: number
  allowedRole: UserRole
  loginPath: string
  defaultPath: string
  logoUrl?: string
  primaryColor?: string
}

export const APP_CONFIGS: Record<UserRole, AppConfig> = {
  ADMIN: {
    name: 'Admin Dashboard',
    port: 3001,
    allowedRole: 'ADMIN',
    loginPath: '/admin/login',
    defaultPath: '/admin/dashboard',
    primaryColor: '#6366f1',
  },
  CUSTOMER: {
    name: 'The Bliss at Home',
    port: 3002,
    allowedRole: 'CUSTOMER',
    loginPath: '/login',
    defaultPath: '/services',
    logoUrl: '/logo.svg',
    primaryColor: '#ec4899',
  },
  HOTEL: {
    name: 'Hotel Partner Portal',
    port: 3003,
    allowedRole: 'HOTEL',
    loginPath: '/hotel/login',
    defaultPath: '/hotel/bookings',
    primaryColor: '#f59e0b',
  },
  STAFF: {
    name: 'Staff Portal',
    port: 3004,
    allowedRole: 'STAFF',
    loginPath: '/staff/login',
    defaultPath: '/staff/jobs',
    primaryColor: '#10b981',
  },
}

// Login error types
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: 'INVALID_CREDENTIALS' | 'INVALID_ROLE' | 'ACCOUNT_DISABLED' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
