import { supabase } from './supabase'
import { USE_MOCK_AUTH } from './mockAuth'

// Types for Staff Applications
export interface StaffApplication {
  id: string
  line_user_id: string
  line_display_name?: string
  line_picture_url?: string
  full_name: string
  phone_number: string
  email?: string
  national_id?: string
  birth_date?: string
  address?: string
  skills: string[]
  experience_years: number
  certifications?: string[]
  portfolio_images?: string[]
  preferred_work_areas?: string[]
  availability_hours?: any
  expected_salary_min?: number
  expected_salary_max?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  rejection_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  approved_at?: string
  application_date: string
  created_at: string
  updated_at: string
}

export interface StaffProfile {
  id: string
  application_id: string
  line_user_id: string
  full_name: string
  phone_number: string
  email?: string
  skills: string[]
  experience_years: number
  rating: number
  total_jobs: number
  is_active: boolean
  is_available: boolean
  last_active_at: string
  created_at: string
  updated_at: string
}

// Mock data for development
const mockApplications: StaffApplication[] = [
  {
    id: '1',
    line_user_id: 'U1234567890abcdef',
    line_display_name: 'สมหญิง นวดเก่ง',
    full_name: 'สมหญิง ใจดี',
    phone_number: '081-234-5678',
    email: 'somying@example.com',
    skills: ['นวดไทย', 'นวดน้ำมัน'],
    experience_years: 5,
    status: 'PENDING',
    application_date: '2026-01-20T10:30:00Z',
    created_at: '2026-01-20T10:30:00Z',
    updated_at: '2026-01-20T10:30:00Z',
  },
  {
    id: '2',
    line_user_id: 'U0987654321fedcba',
    line_display_name: 'ดอกไม้ ทำเล็บเก่ง',
    full_name: 'ดอกไม้ สวยงาม',
    phone_number: '089-876-5432',
    email: 'dokmai@example.com',
    skills: ['เจลเล็บ', 'ทำเล็บ'],
    experience_years: 3,
    status: 'PENDING',
    application_date: '2026-01-19T14:15:00Z',
    created_at: '2026-01-19T14:15:00Z',
    updated_at: '2026-01-19T14:15:00Z',
  },
  {
    id: '3',
    line_user_id: 'Uabcdef1234567890',
    line_display_name: 'แก้ว สปาชำนาญ',
    full_name: 'แก้ว ผ่องใส',
    phone_number: '095-111-2233',
    email: 'kaew@example.com',
    skills: ['สปา', 'ทรีตเมนท์หน้า'],
    experience_years: 7,
    status: 'APPROVED',
    approved_at: '2026-01-18T09:00:00Z',
    application_date: '2026-01-17T16:45:00Z',
    created_at: '2026-01-17T16:45:00Z',
    updated_at: '2026-01-18T09:00:00Z',
  }
]

const mockProfiles: StaffProfile[] = [
  {
    id: '1',
    application_id: '3',
    line_user_id: 'Uabcdef1234567890',
    full_name: 'แก้ว ผ่องใส',
    phone_number: '095-111-2233',
    email: 'kaew@example.com',
    skills: ['สปา', 'ทรีตเมนท์หน้า'],
    experience_years: 7,
    rating: 4.7,
    total_jobs: 89,
    is_active: true,
    is_available: true,
    last_active_at: '2026-01-21T14:30:00Z',
    created_at: '2026-01-18T09:00:00Z',
    updated_at: '2026-01-21T14:30:00Z',
  }
]

// Get all pending staff applications
export async function getPendingStaffApplications(): Promise<StaffApplication[]> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockApplications.filter(app => app.status === 'PENDING')
  }

  const { data, error } = await supabase
    .from('staff_applications')
    .select(`
      *,
      reviewed_by:profiles!staff_applications_reviewed_by_fkey(full_name)
    `)
    .eq('status', 'PENDING')
    .order('application_date', { ascending: false })

  if (error) {
    console.error('Error fetching pending staff applications:', error)
    throw error
  }

  return data as StaffApplication[]
}

// Get all staff applications (with filters)
export async function getStaffApplications(status?: string): Promise<StaffApplication[]> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return status ? mockApplications.filter(app => app.status === status) : mockApplications
  }

  let query = supabase
    .from('staff_applications')
    .select(`
      *,
      reviewed_by:profiles!staff_applications_reviewed_by_fkey(full_name)
    `)
    .order('application_date', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status.toUpperCase())
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching staff applications:', error)
    throw error
  }

  return data as StaffApplication[]
}

// Get staff application by ID
export async function getStaffApplication(id: string): Promise<StaffApplication | null> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return mockApplications.find(app => app.id === id) || null
  }

  const { data, error } = await supabase
    .from('staff_applications')
    .select(`
      *,
      reviewed_by:profiles!staff_applications_reviewed_by_fkey(full_name),
      documents:staff_documents(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching staff application:', error)
    throw error
  }

  return data as StaffApplication
}

// Approve staff application with enhanced One-time approval
export async function approveStaffApplication(applicationId: string, adminId: string): Promise<{
  success: boolean,
  message: string,
  staffProfileId?: string,
  lineUserId?: string
}> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const application = mockApplications.find(app => app.id === applicationId)
    if (!application) {
      return { success: false, message: 'ไม่พบใบสมัคร' }
    }

    // Check for duplicate approval
    if (application.status === 'APPROVED') {
      return { success: false, message: 'ใบสมัครนี้ได้รับการอนุมัติแล้ว' }
    }

    // Check if user already approved
    const existingApproved = mockApplications.find(
      app => app.line_user_id === application.line_user_id && app.status === 'APPROVED'
    )
    if (existingApproved) {
      return { success: false, message: 'ผู้ใช้นี้ได้รับการอนุมัติแล้วในใบสมัครอื่น' }
    }

    application.status = 'APPROVED'
    application.approved_at = new Date().toISOString()
    application.reviewed_by = adminId
    application.reviewed_at = new Date().toISOString()

    // Create staff profile
    const newProfile: StaffProfile = {
      id: Date.now().toString(),
      application_id: applicationId,
      line_user_id: application.line_user_id,
      full_name: application.full_name,
      phone_number: application.phone_number,
      email: application.email,
      skills: application.skills,
      experience_years: application.experience_years,
      rating: 0,
      total_jobs: 0,
      is_active: true,
      is_available: true,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockProfiles.push(newProfile)

    return {
      success: true,
      message: 'อนุมัติเรียบร้อย พนักงานสามารถเข้าใช้งานได้ทันที',
      staffProfileId: newProfile.id,
      lineUserId: application.line_user_id
    }
  }

  const { data, error } = await supabase.rpc('approve_staff_application_v2', {
    p_application_id: applicationId,
    p_admin_id: adminId
  })

  if (error) {
    console.error('Error approving staff application:', error)

    if (error.message?.includes('already has a pending or approved application')) {
      return { success: false, message: 'ผู้ใช้นี้มีใบสมัครที่ได้รับการอนุมัติแล้ว' }
    }

    throw error
  }

  const result = data[0] // Get first row from result

  if (!result?.success) {
    return { success: false, message: 'ไม่สามารถอนุมัติได้ อาจได้รับการอนุมัติแล้ว' }
  }

  return {
    success: true,
    message: 'อนุมัติเรียบร้อย พนักงานสามารถเข้าใช้งานได้ทันที',
    staffProfileId: result.staff_profile_id,
    lineUserId: result.line_user_id
  }
}

// Reject staff application
export async function rejectStaffApplication(applicationId: string, adminId: string, reason: string): Promise<boolean> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const application = mockApplications.find(app => app.id === applicationId)
    if (application) {
      application.status = 'REJECTED'
      application.rejection_reason = reason
      application.reviewed_by = adminId
      application.reviewed_at = new Date().toISOString()
      return true
    }
    return false
  }

  const { data, error } = await supabase.rpc('reject_staff_application', {
    p_application_id: applicationId,
    p_admin_id: adminId,
    p_rejection_reason: reason
  })

  if (error) {
    console.error('Error rejecting staff application:', error)
    throw error
  }

  return data === true
}

// Get all active staff profiles
export async function getStaffProfiles(filters?: {
  is_active?: boolean
  skills?: string[]
  min_rating?: number
}): Promise<StaffProfile[]> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 300))
    let filtered = [...mockProfiles]

    if (filters?.is_active !== undefined) {
      filtered = filtered.filter(profile => profile.is_active === filters.is_active)
    }

    if (filters?.skills?.length) {
      filtered = filtered.filter(profile =>
        filters.skills!.some(skill => profile.skills.includes(skill))
      )
    }

    if (filters?.min_rating) {
      filtered = filtered.filter(profile => profile.rating >= filters.min_rating!)
    }

    return filtered
  }

  let query = supabase
    .from('staff_profiles')
    .select('*')
    .order('rating', { ascending: false })

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.min_rating) {
    query = query.gte('rating', filters.min_rating)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching staff profiles:', error)
    throw error
  }

  let results = data as StaffProfile[]

  // Filter by skills (PostgreSQL array filtering is complex, so we do it client-side)
  if (filters?.skills?.length) {
    results = results.filter(profile =>
      filters.skills!.some(skill => profile.skills.includes(skill))
    )
  }

  return results
}

// Get staff statistics
export async function getStaffStats() {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      pending_applications: mockApplications.filter(app => app.status === 'PENDING').length,
      approved_applications: mockApplications.filter(app => app.status === 'APPROVED').length,
      rejected_applications: mockApplications.filter(app => app.status === 'REJECTED').length,
      active_staff: mockProfiles.filter(profile => profile.is_active).length,
      total_staff: mockProfiles.length,
      average_rating: mockProfiles.reduce((sum, p) => sum + p.rating, 0) / mockProfiles.length || 0,
      total_jobs_completed: mockProfiles.reduce((sum, p) => sum + p.total_jobs, 0),
    }
  }

  // Get application stats
  const { data: applicationStats } = await supabase
    .from('staff_applications')
    .select('status')

  // Get profile stats
  const { data: profileStats } = await supabase
    .from('staff_profiles')
    .select('is_active, rating, total_jobs')

  const apps = applicationStats || []
  const profiles = profileStats || []

  return {
    pending_applications: apps.filter(a => a.status === 'PENDING').length,
    approved_applications: apps.filter(a => a.status === 'APPROVED').length,
    rejected_applications: apps.filter(a => a.status === 'REJECTED').length,
    active_staff: profiles.filter(p => p.is_active).length,
    total_staff: profiles.length,
    average_rating: profiles.reduce((sum, p) => sum + p.rating, 0) / profiles.length || 0,
    total_jobs_completed: profiles.reduce((sum, p) => sum + p.total_jobs, 0),
  }
}

// Toggle staff profile active status
export async function toggleStaffStatus(profileId: string): Promise<boolean> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const profile = mockProfiles.find(p => p.id === profileId)
    if (profile) {
      profile.is_active = !profile.is_active
      profile.updated_at = new Date().toISOString()
      return true
    }
    return false
  }

  // Get current status first
  const { data: currentProfile } = await supabase
    .from('staff_profiles')
    .select('is_active')
    .eq('id', profileId)
    .single()

  if (!currentProfile) {
    throw new Error('Staff profile not found')
  }

  // Update with opposite status
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: !currentProfile.is_active })
    .eq('id', profileId)

  if (error) {
    console.error('Error toggling staff status:', error)
    throw error
  }

  return true
}

// Check if staff is already approved (for LINE LIFF integration)
export async function checkStaffStatus(lineUserId: string): Promise<{
  isApproved: boolean,
  staffProfile?: StaffProfile,
  status: 'not_applied' | 'pending' | 'approved' | 'rejected'
}> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200))

    const application = mockApplications.find(app => app.line_user_id === lineUserId)
    if (!application) {
      return { isApproved: false, status: 'not_applied' }
    }

    if (application.status === 'PENDING') {
      return { isApproved: false, status: 'pending' }
    }

    if (application.status === 'REJECTED') {
      return { isApproved: false, status: 'rejected' }
    }

    if (application.status === 'APPROVED') {
      const profile = mockProfiles.find(p => p.line_user_id === lineUserId)
      return {
        isApproved: true,
        status: 'approved',
        staffProfile: profile
      }
    }

    return { isApproved: false, status: 'not_applied' }
  }

  const { data, error } = await supabase.rpc('staff_login_check', {
    p_line_user_id: lineUserId
  })

  if (error) {
    console.error('Error checking staff status:', error)
    throw error
  }

  const result = data[0]

  if (!result || !result.is_approved) {
    // Check if there's a pending application
    const { data: application } = await supabase
      .from('staff_applications')
      .select('status')
      .eq('line_user_id', lineUserId)
      .single()

    if (!application) {
      return { isApproved: false, status: 'not_applied' }
    }

    return {
      isApproved: false,
      status: application.status.toLowerCase() as 'pending' | 'rejected'
    }
  }

  // Convert result to StaffProfile format
  const staffProfile: StaffProfile = {
    id: result.staff_profile_id,
    application_id: '', // We don't need this for login check
    line_user_id: lineUserId,
    full_name: result.full_name,
    phone_number: '', // These would need to be added to the function if needed
    email: '',
    skills: result.skills,
    experience_years: 0,
    rating: result.rating,
    total_jobs: result.total_jobs,
    is_active: result.is_active,
    is_available: true,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return {
    isApproved: true,
    status: 'approved',
    staffProfile
  }
}

// Prevent duplicate applications (for LINE LIFF form)
export async function canApplyAsStaff(lineUserId: string): Promise<{
  canApply: boolean,
  reason?: string,
  existingStatus?: string
}> {
  const statusCheck = await checkStaffStatus(lineUserId)

  switch (statusCheck.status) {
    case 'not_applied':
      return { canApply: true }
    case 'pending':
      return {
        canApply: false,
        reason: 'คุณมีใบสมัครรออนุมัติอยู่แล้ว',
        existingStatus: 'pending'
      }
    case 'approved':
      return {
        canApply: false,
        reason: 'คุณเป็นพนักงานที่ได้รับการอนุมัติแล้ว',
        existingStatus: 'approved'
      }
    case 'rejected':
      return {
        canApply: true, // Allow reapplication after rejection
        reason: 'ใบสมัครก่อนหน้าถูกปฏิเสธ สามารถสมัครใหม่ได้'
      }
    default:
      return { canApply: false, reason: 'เกิดข้อผิดพลาด' }
  }
}