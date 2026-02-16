import { supabase } from '../lib/supabase'

// Check if we're in mock mode
const isMockMode = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

// Mock data for development
const mockStaffData: Staff[] = [
  {
    id: 'STF001',
    name_th: 'สมหญิง นวดเก่ง',
    phone: '081-234-5678',
    status: 'active',
    rating: 4.8,
    total_reviews: 156,
    total_jobs: 1250,
    total_earnings: 450000,
    is_available: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z',
    profile: { email: 'somying@thebliss.com' },
    skills: [
      {
        id: 'skill1',
        staff_id: 'STF001',
        skill_id: 'massage',
        level: 'expert',
        years_experience: 5,
        skill: { id: 'massage', name_th: 'นวดแผนไทย', name_en: 'Thai Massage' }
      }
    ]
  },
  {
    id: 'STF002',
    name_th: 'ดอกไม้ ทำเล็บสวย',
    phone: '082-345-6789',
    status: 'active',
    rating: 4.9,
    total_reviews: 203,
    total_jobs: 890,
    total_earnings: 320000,
    is_available: true,
    created_at: '2023-06-20T00:00:00Z',
    updated_at: '2023-06-20T00:00:00Z',
    profile: { email: 'dokmai@thebliss.com' },
    skills: [
      {
        id: 'skill2',
        staff_id: 'STF002',
        skill_id: 'nail',
        level: 'advanced',
        years_experience: 3,
        skill: { id: 'nail', name_th: 'ทำเล็บ', name_en: 'Nail Art' }
      }
    ]
  },
  {
    id: 'STF003',
    name_th: 'แก้ว สปาชำนาญ',
    phone: '083-456-7890',
    status: 'active',
    rating: 4.7,
    total_reviews: 89,
    total_jobs: 670,
    total_earnings: 520000,
    is_available: true,
    created_at: '2022-03-10T00:00:00Z',
    updated_at: '2022-03-10T00:00:00Z',
    profile: { email: 'kaew@thebliss.com' },
    skills: [
      {
        id: 'skill3',
        staff_id: 'STF003',
        skill_id: 'spa',
        level: 'expert',
        years_experience: 7,
        skill: { id: 'spa', name_th: 'สปา', name_en: 'Spa Treatment' }
      },
      {
        id: 'skill4',
        staff_id: 'STF003',
        skill_id: 'massage',
        level: 'intermediate',
        years_experience: 4,
        skill: { id: 'massage', name_th: 'นวดแผนไทย', name_en: 'Thai Massage' }
      }
    ]
  },
  {
    id: 'STF004',
    name_th: 'มานี รอดำเนินการ',
    phone: '084-567-8901',
    status: 'pending',
    rating: 0,
    total_reviews: 0,
    total_jobs: 0,
    total_earnings: 0,
    is_available: false,
    created_at: '2025-01-28T00:00:00Z',
    updated_at: '2025-01-28T00:00:00Z',
    profile: { email: 'manee@thebliss.com' },
    skills: [
      {
        id: 'skill5',
        staff_id: 'STF004',
        skill_id: 'nail',
        level: 'intermediate',
        years_experience: 2,
        skill: { id: 'nail', name_th: 'ทำเล็บ', name_en: 'Nail Art' }
      }
    ]
  }
]

// Simulate async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface Staff {
  id: string
  profile_id?: string
  name_th: string
  name_en?: string
  phone: string
  id_card?: string
  address?: string
  bank_name?: string
  bank_account?: string
  bank_account_name?: string
  bio_th?: string
  bio_en?: string
  avatar_url?: string
  invite_token?: string | null
  invite_token_expires_at?: string | null
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  rating: number
  total_reviews: number
  total_jobs: number
  total_earnings: number
  is_available: boolean
  current_location_lat?: number
  current_location_lng?: number
  created_at: string
  updated_at: string
  skills?: StaffSkill[]
  profile?: {
    email: string
    full_name?: string
  }
}

export interface InviteLinkData {
  inviteLink: string
  qrCode: string
  expiresAt: string
  isExpired: boolean
}

export interface StaffSkill {
  id: string
  staff_id: string
  skill_id: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_experience: number
  skill?: {
    id: string
    name_th: string
    name_en: string
  }
}

export interface CreateStaffData {
  name_th: string
  name_en?: string
  phone: string
  id_card?: string
  address?: string
  bio_th?: string
  bio_en?: string
  skills?: string[] // skill IDs
}

export const staffService = {
  // Get all staff with filters
  async getAllStaff(filters?: {
    status?: string
    skill?: string
    search?: string
  }) {
    if (isMockMode) {
      await delay(500) // Simulate network delay

      let filteredData = [...mockStaffData]

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        filteredData = filteredData.filter(staff => staff.status === filters.status)
      }

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(staff =>
          staff.name_th.toLowerCase().includes(searchLower) ||
          staff.phone.includes(filters.search) ||
          staff.profile?.email?.toLowerCase().includes(searchLower)
        )
      }

      return filteredData
    }

    let query = supabase
      .from('staff')
      .select(`
        *,
        skills:staff_skills(
          id,
          skill_id,
          level,
          years_experience,
          skill:skills(id, name_th, name_en)
        )
      `)
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.or(`name_th.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Staff[]
  },

  // Get staff by ID
  async getStaffById(id: string) {
    if (isMockMode) {
      await delay(300)
      const staff = mockStaffData.find(s => s.id === id)
      if (!staff) throw new Error('Staff not found')
      return staff
    }

    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        skills:staff_skills(
          id,
          skill_id,
          level,
          years_experience,
          skill:skills(id, name_th, name_en)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Staff
  },

  // Create new staff
  async createStaff(staffData: CreateStaffData) {
    if (isMockMode) {
      await delay(800)
      const newStaff: Staff = {
        id: `STF${String(mockStaffData.length + 1).padStart(3, '0')}`,
        name_th: staffData.name_th,
        name_en: staffData.name_en,
        phone: staffData.phone,
        id_card: staffData.id_card,
        address: staffData.address,
        bio_th: staffData.bio_th,
        bio_en: staffData.bio_en,
        status: 'pending',
        rating: 0,
        total_reviews: 0,
        total_jobs: 0,
        total_earnings: 0,
        is_available: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: { email: `${staffData.name_th.toLowerCase().replace(/\s+/g, '.')}@thebliss.com` },
        skills: staffData.skills?.map(skillId => ({
          id: `skill_${Math.random().toString(36).substr(2, 9)}`,
          staff_id: `STF${String(mockStaffData.length + 1).padStart(3, '0')}`,
          skill_id: skillId,
          level: 'intermediate' as const,
          years_experience: 0,
          skill: {
            id: skillId,
            name_th: skillId === 'massage' ? 'นวดแผนไทย' : skillId === 'nail' ? 'ทำเล็บ' : 'สปา',
            name_en: skillId === 'massage' ? 'Thai Massage' : skillId === 'nail' ? 'Nail Art' : 'Spa Treatment'
          }
        })) || []
      }
      mockStaffData.push(newStaff)
      return newStaff
    }

    const { data, error } = await supabase
      .from('staff')
      .insert({
        name_th: staffData.name_th,
        name_en: staffData.name_en,
        phone: staffData.phone,
        id_card: staffData.id_card,
        address: staffData.address,
        bio_th: staffData.bio_th,
        bio_en: staffData.bio_en,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Add skills if provided (skill IDs are already real UUIDs from the skills table)
    if (staffData.skills && staffData.skills.length > 0 && data) {
      const skillsData = staffData.skills.map(skillId => ({
        staff_id: data.id,
        skill_id: skillId,
        level: 'intermediate' as const,
        years_experience: 0
      }))

      const { error: skillsError } = await supabase
        .from('staff_skills')
        .insert(skillsData)

      if (skillsError) throw skillsError
    }

    return data
  },

  // Update staff status
  async updateStaffStatus(id: string, status: Staff['status']) {
    if (isMockMode) {
      await delay(500)
      const staffIndex = mockStaffData.findIndex(s => s.id === id)
      if (staffIndex === -1) throw new Error('Staff not found')

      mockStaffData[staffIndex] = {
        ...mockStaffData[staffIndex],
        status,
        updated_at: new Date().toISOString()
      }

      return mockStaffData[staffIndex]
    }

    const { data, error } = await supabase
      .from('staff')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update staff profile
  async updateStaff(id: string, updates: Partial<CreateStaffData>) {
    if (isMockMode) {
      await delay(500)
      const staffIndex = mockStaffData.findIndex(s => s.id === id)
      if (staffIndex === -1) throw new Error('Staff not found')

      mockStaffData[staffIndex] = {
        ...mockStaffData[staffIndex],
        ...updates,
        updated_at: new Date().toISOString()
      }

      return mockStaffData[staffIndex]
    }

    // Extract skills from updates (skills should be handled separately)
    const { skills, ...staffUpdates } = updates

    // Update basic staff information (excluding skills)
    const { data, error } = await supabase
      .from('staff')
      .update({
        ...staffUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update skills if provided
    if (skills !== undefined) {
      // Delete existing skills
      const { error: deleteError } = await supabase
        .from('staff_skills')
        .delete()
        .eq('staff_id', id)

      if (deleteError) throw deleteError

      // Insert new skills if any (skill IDs are already real UUIDs)
      if (skills.length > 0) {
        const skillsData = skills.map(skillId => ({
          staff_id: id,
          skill_id: skillId,
          level: 'intermediate' as const,
          years_experience: 0
        }))

        const { error: skillsError } = await supabase
          .from('staff_skills')
          .insert(skillsData)

        if (skillsError) throw skillsError
      }
    }

    return data
  },

  // Get staff statistics
  async getStaffStats() {
    if (isMockMode) {
      await delay(200)
      const data = mockStaffData

      const stats = {
        total: data.length,
        active: data.filter(s => s.status === 'active').length,
        pending: data.filter(s => s.status === 'pending').length,
        inactive: data.filter(s => s.status === 'inactive').length,
        suspended: data.filter(s => s.status === 'suspended').length,
        averageRating: data.length > 0
          ? data.reduce((acc, s) => acc + (s.rating || 0), 0) / data.length
          : 0
      }

      return stats
    }

    const { data, error } = await supabase
      .from('staff')
      .select('status, rating')

    if (error) throw error

    const stats = {
      total: data.length,
      active: data.filter(s => s.status === 'active').length,
      pending: data.filter(s => s.status === 'pending').length,
      inactive: data.filter(s => s.status === 'inactive').length,
      suspended: data.filter(s => s.status === 'suspended').length,
      averageRating: data.length > 0
        ? data.reduce((acc, s) => acc + (s.rating || 0), 0) / data.length
        : 0
    }

    return stats
  },

  // Generate LINE invite link
  async generateLineInvite(staffData: CreateStaffData) {
    // Create staff record first
    const staff = await this.createStaff(staffData)

    // Generate a secure invite token (UUID)
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    if (isMockMode) {
      await delay(1000)
      const mockLiffUrl = `http://localhost:3007/staff/login?token=${inviteToken}`

      return {
        staff,
        inviteLink: mockLiffUrl,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockLiffUrl)}`
      }
    }

    // Store invite token in database
    const { error: tokenError } = await supabase
      .from('staff')
      .update({
        invite_token: inviteToken,
        invite_token_expires_at: expiresAt.toISOString()
      })
      .eq('id', staff.id)

    if (tokenError) throw tokenError

    // Generate invite link with secure token
    // IMPORTANT: Do NOT add extra path after LIFF URL — LIFF appends path to its Endpoint URL
    // So we pass token as query param only: liff.line.me/LIFF_ID?token=xxx
    // Login.tsx will read the token from liff.state or URL params
    const baseUrl = import.meta.env.VITE_LINE_LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID'
    const inviteLink = `${baseUrl}?token=${inviteToken}`

    return {
      staff,
      inviteLink,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`
    }
  },

  // Get existing invite link for a staff member
  async getInviteLink(staffId: string): Promise<InviteLinkData | null> {
    if (isMockMode) {
      await delay(300)
      const mockToken = 'mock-token-' + staffId.slice(0, 8)
      const mockLink = `http://localhost:3007/staff/login?token=${mockToken}`
      return {
        inviteLink: mockLink,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockLink)}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false,
      }
    }

    const { data, error } = await supabase
      .from('staff')
      .select('invite_token, invite_token_expires_at')
      .eq('id', staffId)
      .single()

    if (error || !data?.invite_token) return null

    const baseUrl = import.meta.env.VITE_LINE_LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID'
    const inviteLink = `${baseUrl}?token=${data.invite_token}`
    const isExpired = data.invite_token_expires_at
      ? new Date(data.invite_token_expires_at) < new Date()
      : false

    return {
      inviteLink,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`,
      expiresAt: data.invite_token_expires_at || '',
      isExpired,
    }
  },

  // Regenerate invite link (new token, extends expiry)
  async regenerateInvite(staffId: string): Promise<InviteLinkData> {
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    if (isMockMode) {
      await delay(500)
      const mockLink = `http://localhost:3007/staff/login?token=${inviteToken}`
      return {
        inviteLink: mockLink,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockLink)}`,
        expiresAt: expiresAt.toISOString(),
        isExpired: false,
      }
    }

    const { error } = await supabase
      .from('staff')
      .update({
        invite_token: inviteToken,
        invite_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', staffId)

    if (error) throw error

    const baseUrl = import.meta.env.VITE_LINE_LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID'
    const inviteLink = `${baseUrl}?token=${inviteToken}`

    return {
      inviteLink,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
    }
  },
}