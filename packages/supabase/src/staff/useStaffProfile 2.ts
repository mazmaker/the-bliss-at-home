/**
 * Staff Profile Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/hooks'
import { staffService } from './staffService'
import type { StaffDocument, ServiceArea, StaffSkill, DocumentType, StaffEligibility } from './types'

// ============================================
// useDocuments Hook
// ============================================

export function useDocuments() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [documents, setDocuments] = useState<StaffDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const data = await staffService.getDocuments(user.id)
      setDocuments(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchDocuments()
    }
  }, [isAuthLoading, user?.id, fetchDocuments])

  const uploadDocument = async (type: DocumentType, file: File, notes?: string, expires_at?: string) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsUploading(true)
      setError(null)
      const newDoc = await staffService.uploadDocument(user.id, type, file, notes, expires_at)
      setDocuments((prev) => [newDoc, ...prev])
      return newDoc
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      setError(null)
      await staffService.deleteDocument(documentId)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return {
    documents,
    isLoading,
    isUploading,
    error,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  }
}

// ============================================
// useServiceAreas Hook
// ============================================

export function useServiceAreas() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAreas = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const data = await staffService.getServiceAreas(user.id)
      setAreas(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchAreas()
    }
  }, [isAuthLoading, user?.id, fetchAreas])

  const addArea = async (data: {
    province: string
    district?: string
    subdistrict?: string
    postal_code?: string
    radius_km?: number
  }) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      const newArea = await staffService.addServiceArea(user.id, data)
      setAreas((prev) => [newArea, ...prev])
      return newArea
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const updateArea = async (areaId: string, data: Partial<ServiceArea>) => {
    try {
      setIsSaving(true)
      setError(null)
      await staffService.updateServiceArea(areaId, data)
      setAreas((prev) =>
        prev.map((a) => (a.id === areaId ? { ...a, ...data } : a))
      )
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const deleteArea = async (areaId: string) => {
    try {
      setError(null)
      await staffService.deleteServiceArea(areaId)
      setAreas((prev) => prev.filter((a) => a.id !== areaId))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const toggleArea = async (areaId: string, isActive: boolean) => {
    await updateArea(areaId, { is_active: isActive })
  }

  return {
    areas,
    isLoading,
    isSaving,
    error,
    addArea,
    updateArea,
    deleteArea,
    toggleArea,
    refetch: fetchAreas,
  }
}

// ============================================
// useStaffSkills Hook
// ============================================

export function useStaffSkills() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [skills, setSkills] = useState<StaffSkill[]>([])
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name_th: string; name_en: string; category: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const data = await staffService.getSkills(user.id)
      setSkills(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const fetchAvailableSkills = useCallback(async () => {
    try {
      const data = await staffService.getAllSkills()
      setAvailableSkills(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchSkills()
      fetchAvailableSkills()
    }
  }, [isAuthLoading, user?.id, fetchSkills, fetchAvailableSkills])

  const addSkill = async (
    skillId: string,
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    yearsExperience?: number
  ) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      const newSkill = await staffService.addSkill(user.id, skillId, level, yearsExperience)
      setSkills((prev) => [newSkill, ...prev])
      return newSkill
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const updateSkill = async (
    skillId: string,
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    yearsExperience?: number
  ) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      await staffService.updateSkillLevel(user.id, skillId, level, yearsExperience)
      setSkills((prev) =>
        prev.map((s) => (s.skill_id === skillId ? { ...s, level, years_experience: yearsExperience } : s))
      )
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSkill = async (skillId: string) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      await staffService.deleteSkill(user.id, skillId)
      setSkills((prev) => prev.filter((s) => s.skill_id !== skillId))
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return {
    skills,
    availableSkills,
    isLoading,
    isSaving,
    error,
    addSkill,
    updateSkill,
    deleteSkill,
    refetch: fetchSkills,
  }
}

// ============================================
// useProfileUpdate Hook
// ============================================

export function useProfileUpdate() {
  const { user, refreshUser } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = async (data: {
    full_name?: string
    phone?: string
    address?: string
  }) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      await staffService.updateProfile(user.id, data)
      await refreshUser?.()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      const url = await staffService.uploadAvatar(user.id, file)
      await refreshUser?.()
      return url
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const updateStaffData = async (data: {
    name_th?: string
    name_en?: string
    phone?: string
    id_card?: string
    address?: string
    bio_th?: string
    bio_en?: string
  }) => {
    if (!user?.id) throw new Error('Not authenticated')

    try {
      setIsSaving(true)
      setError(null)
      await staffService.updateStaffData(user.id, data)
      // No need to refreshUser since we're updating staff table, not profiles table
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const changePassword = async (newPassword: string) => {
    try {
      setIsSaving(true)
      setError(null)
      await staffService.updatePassword(newPassword)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isSaving,
    error,
    updateProfile,
    updateStaffData,
    uploadAvatar,
    changePassword,
  }
}

// ============================================
// useStaffEligibility Hook
// ============================================

export function useStaffEligibility() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [eligibility, setEligibility] = useState<StaffEligibility | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEligibility = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const data = await staffService.canStaffStartWork(user.id)
      setEligibility(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchEligibility()
    }
  }, [isAuthLoading, user?.id, fetchEligibility])

  return {
    eligibility,
    isLoading,
    error,
    refetch: fetchEligibility,
  }
}
