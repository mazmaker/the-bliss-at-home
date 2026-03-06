import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFromFn, mockStorage, mockAuth } = vi.hoisted(() => ({
  mockFromFn: vi.fn(),
  mockStorage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/file.jpg' } }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
  mockAuth: { updateUser: vi.fn() },
}))

vi.mock('../../auth/supabaseClient', () => ({
  supabase: {
    from: mockFromFn,
    auth: mockAuth,
    storage: mockStorage,
  },
}))

function createBuilder(resolveValue: any = { data: null, error: null }) {
  const b: any = {}
  const m = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'is', 'upsert']
  m.forEach(k => { b[k] = vi.fn().mockReturnValue(b) })
  b.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return b
}

import {
  updateProfile,
  updateStaffData,
  updatePassword,
  getDocuments,
  deleteDocument,
  getServiceAreas,
  addServiceArea,
  updateServiceArea,
  deleteServiceArea,
  getAllSkills,
  getSkills,
  addSkill,
  deleteSkill,
  canStaffStartWork,
} from '../staffService'

describe('staffService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('updateProfile', () => {
    it('should update profiles table', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)

      await updateProfile('staff-1', { full_name: 'New Name' })

      expect(mockFromFn).toHaveBeenCalledWith('profiles')
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({
        full_name: 'New Name',
      }))
      expect(b.eq).toHaveBeenCalledWith('id', 'staff-1')
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ error: { message: 'Error' } }))

      await expect(updateProfile('staff-1', {})).rejects.toBeTruthy()
    })
  })

  describe('updateStaffData', () => {
    it('should look up staff ID then update staff table', async () => {
      // First call: get staff ID
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      // Second call: update staff
      mockFromFn.mockReturnValueOnce(createBuilder({ error: null }))

      await updateStaffData('profile-1', { name_th: 'สมชาย' })

      expect(mockFromFn).toHaveBeenCalledWith('staff')
    })

    it('should throw when staff record not found', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      await expect(updateStaffData('profile-1', {})).rejects.toThrow('Staff record not found')
    })

    it('should throw on lookup error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'DB error' } }))

      await expect(updateStaffData('profile-1', {})).rejects.toBeTruthy()
    })
  })

  describe('updatePassword', () => {
    it('should call supabase.auth.updateUser', async () => {
      mockAuth.updateUser.mockResolvedValueOnce({ error: null })

      await updatePassword('newPass123')

      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newPass123' })
    })

    it('should throw on error', async () => {
      mockAuth.updateUser.mockResolvedValueOnce({ error: { message: 'Weak password' } })

      await expect(updatePassword('123')).rejects.toBeTruthy()
    })
  })

  describe('getDocuments', () => {
    it('should fetch documents for staff', async () => {
      // First: get staff ID
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      // Second: get documents
      const docs = [{ id: 'doc-1', document_type: 'id_card' }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: docs, error: null }))

      const result = await getDocuments('profile-1')
      expect(result).toEqual(docs)
    })

    it('should throw when staff not found', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      await expect(getDocuments('profile-1')).rejects.toThrow('Staff record not found')
    })
  })

  describe('deleteDocument', () => {
    it('should delete from storage and database', async () => {
      // First: fetch document
      mockFromFn.mockReturnValueOnce(createBuilder({
        data: { file_url: 'https://storage.example.com/staff-documents/staff-1/id_card.jpg' },
        error: null,
      }))
      // Second: delete record
      mockFromFn.mockReturnValueOnce(createBuilder({ error: null }))

      await deleteDocument('doc-1')

      expect(mockFromFn).toHaveBeenCalledWith('staff_documents')
    })

    it('should throw on fetch error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Not found' } }))

      await expect(deleteDocument('doc-1')).rejects.toBeTruthy()
    })
  })

  describe('getServiceAreas', () => {
    it('should fetch service areas for staff', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      const areas = [{ id: 'area-1', province: 'Bangkok' }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: areas, error: null }))

      const result = await getServiceAreas('profile-1')
      expect(result).toEqual(areas)
    })
  })

  describe('addServiceArea', () => {
    it('should add service area with defaults', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      const area = { id: 'area-new', province: 'Bangkok', radius_km: 10 }
      mockFromFn.mockReturnValueOnce(createBuilder({ data: area, error: null }))

      const result = await addServiceArea('profile-1', { province: 'Bangkok' })
      expect(result).toEqual(area)
    })
  })

  describe('updateServiceArea', () => {
    it('should update service area', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)

      await updateServiceArea('area-1', { province: 'Chiang Mai' } as any)
      expect(b.update).toHaveBeenCalled()
    })
  })

  describe('deleteServiceArea', () => {
    it('should delete service area', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)

      await deleteServiceArea('area-1')
      expect(b.delete).toHaveBeenCalled()
    })
  })

  describe('getAllSkills', () => {
    it('should fetch all skills', async () => {
      const skills = [{ id: 's1', name_th: 'นวดไทย', name_en: 'Thai Massage', category: 'massage' }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: skills, error: null }))

      const result = await getAllSkills()
      expect(result).toEqual(skills)
      expect(mockFromFn).toHaveBeenCalledWith('skills')
    })

    it('should return empty array when no data', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      const result = await getAllSkills()
      expect(result).toEqual([])
    })
  })

  describe('getSkills', () => {
    it('should fetch staff skills with join', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      const skills = [
        { id: 'ss1', skill_id: 's1', level: 'intermediate', skill: { name_th: 'นวดไทย', name_en: 'Thai Massage' } },
      ]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: skills, error: null }))

      const result = await getSkills('profile-1')
      expect(result[0].skill_name).toBe('นวดไทย')
      expect(result[0].skill_name_en).toBe('Thai Massage')
    })
  })

  describe('addSkill', () => {
    it('should upsert skill with defaults', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      const skill = { id: 'ss1', skill_id: 's1', level: 'intermediate' }
      const b = createBuilder({ data: skill, error: null })
      mockFromFn.mockReturnValueOnce(b)

      const result = await addSkill('profile-1', 's1')
      expect(result).toEqual(skill)
      expect(b.upsert).toHaveBeenCalled()
    })
  })

  describe('deleteSkill', () => {
    it('should delete skill from staff', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1' }, error: null }))
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)

      await deleteSkill('profile-1', 's1')
      expect(b.delete).toHaveBeenCalled()
    })
  })

  describe('canStaffStartWork', () => {
    it('should return canWork=true when all conditions met', async () => {
      // Staff lookup - must include gender for canWork to be true
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1', status: 'active', gender: 'female' }, error: null }))
      // Documents
      mockFromFn.mockReturnValueOnce(createBuilder({
        data: [
          { document_type: 'id_card', verification_status: 'verified' },
          { document_type: 'bank_statement', verification_status: 'verified' },
        ],
        error: null,
      }))

      const result = await canStaffStartWork('profile-1')

      expect(result.canWork).toBe(true)
      expect(result.status).toBe('active')
      expect(result.reasons).toHaveLength(0)
      expect(result.documents.id_card.verified).toBe(true)
      expect(result.documents.bank_statement.verified).toBe(true)
    })

    it('should return canWork=false when staff not active', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1', status: 'pending' }, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({
        data: [
          { document_type: 'id_card', verification_status: 'verified' },
          { document_type: 'bank_statement', verification_status: 'verified' },
        ],
        error: null,
      }))

      const result = await canStaffStartWork('profile-1')

      expect(result.canWork).toBe(false)
      expect(result.reasons).toContain('บัญชียังไม่ได้รับการอนุมัติจากแอดมิน')
    })

    it('should return canWork=false when documents missing', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1', status: 'active' }, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({ data: [], error: null }))

      const result = await canStaffStartWork('profile-1')

      expect(result.canWork).toBe(false)
      expect(result.documents.id_card.uploaded).toBe(false)
      expect(result.documents.bank_statement.uploaded).toBe(false)
    })

    it('should return canWork=false when documents pending', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'sid-1', status: 'active' }, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({
        data: [
          { document_type: 'id_card', verification_status: 'pending' },
          { document_type: 'bank_statement', verification_status: 'rejected' },
        ],
        error: null,
      }))

      const result = await canStaffStartWork('profile-1')

      expect(result.canWork).toBe(false)
      expect(result.reasons.some((r: string) => r.includes('รอการตรวจสอบ'))).toBe(true)
      expect(result.reasons.some((r: string) => r.includes('ปฏิเสธ'))).toBe(true)
    })

    it('should return defaults when staff not found', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Not found' } }))

      const result = await canStaffStartWork('nonexistent')

      expect(result.canWork).toBe(false)
      expect(result.status).toBe('pending')
      expect(result.reasons).toContain('ไม่พบข้อมูลพนักงาน')
    })
  })
})
