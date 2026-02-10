import { supabase } from './supabase'
import { USE_MOCK_AUTH } from './mockAuth'

// Mock services data for development
let mockServices: Service[] = [
  {
    id: '1',
    name_th: 'นวดไทยแบบดั้งเดิม',
    name_en: 'Traditional Thai Massage',
    description_th: 'นวดไทยแบบดั้งเดิมที่ช่วยผ่อนคลายกล้ามเนื้อ',
    description_en: 'Traditional Thai massage for muscle relaxation',
    category: 'massage',
    duration: 120,
    base_price: 800,
    hotel_price: 640,
    image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80',
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name_th: 'นวดน้ำมันอโรมา',
    name_en: 'Aromatherapy Oil Massage',
    description_th: 'นวดน้ำมันอโรมาเพื่อผ่อนคลายจิตใจ',
    description_en: 'Aromatherapy oil massage for mental relaxation',
    category: 'massage',
    duration: 120,
    base_price: 1000,
    hotel_price: 800,
    image_url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80',
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name_th: 'เจลเล็บมือ',
    name_en: 'Hand Gel Manicure',
    description_th: 'ทำเล็บมือด้วยเจลคุณภาพสูง',
    description_en: 'High-quality gel manicure service',
    category: 'nail',
    duration: 60,
    base_price: 450,
    hotel_price: 360,
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80',
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
]

export interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category: 'massage' | 'nail' | 'spa'
  duration: number
  base_price: number
  hotel_price: number
  image_url?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateServiceData {
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category: 'massage' | 'nail' | 'spa'
  duration: number
  base_price: number
  hotel_price: number
  image_url?: string
  sort_order?: number
}

// Get all services
export async function getServices() {
  if (USE_MOCK_AUTH) {
    // Return mock data for development
    return [...mockServices].sort((a, b) => a.sort_order - b.sort_order)
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching services:', error)
    throw error
  }

  return data as Service[]
}

// Get services by category
export async function getServicesByCategory(category: string) {
  if (category === 'all') {
    return getServices()
  }

  if (USE_MOCK_AUTH) {
    // Return filtered mock data
    return mockServices
      .filter(service => service.category === category && service.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching services by category:', error)
    throw error
  }

  return data as Service[]
}

// Create new service
export async function createService(serviceData: CreateServiceData) {
  if (USE_MOCK_AUTH) {
    // Create mock service
    const newService: Service = {
      id: `mock-${Date.now()}`,
      ...serviceData,
      is_active: true,
      sort_order: serviceData.sort_order || mockServices.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Add to mock data
    mockServices.push(newService)

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500))

    return newService
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      ...serviceData,
      is_active: true,
      sort_order: serviceData.sort_order || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating service:', error)
    throw error
  }

  return data as Service
}

// Update service
export async function updateService(id: string, serviceData: Partial<CreateServiceData>) {
  const { data, error } = await supabase
    .from('services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating service:', error)
    throw error
  }

  return data as Service
}

// Delete service (soft delete by setting is_active to false)
export async function deleteService(id: string) {
  const { error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting service:', error)
    throw error
  }
}

// Toggle service active status
export async function toggleServiceStatus(id: string) {
  if (USE_MOCK_AUTH) {
    // Find and toggle status in mock data
    const serviceIndex = mockServices.findIndex(s => s.id === id)
    if (serviceIndex === -1) {
      throw new Error('Service not found')
    }

    const service = mockServices[serviceIndex]
    const updatedService = {
      ...service,
      is_active: !service.is_active,
      updated_at: new Date().toISOString(),
    }

    mockServices[serviceIndex] = updatedService

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 300))

    return updatedService
  }

  // First get current status
  const { data: currentService } = await supabase
    .from('services')
    .select('is_active')
    .eq('id', id)
    .single()

  if (!currentService) {
    throw new Error('Service not found')
  }

  // Update with opposite status
  const { data, error } = await supabase
    .from('services')
    .update({ is_active: !currentService.is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error toggling service status:', error)
    throw error
  }

  return data as Service
}

// Get service statistics for admin dashboard
export async function getServiceStats() {
  const { data, error } = await supabase
    .from('services')
    .select('category, is_active')

  if (error) {
    console.error('Error fetching service stats:', error)
    throw error
  }

  const stats = {
    total: data.length,
    active: data.filter(s => s.is_active).length,
    inactive: data.filter(s => !s.is_active).length,
    byCategory: {
      massage: data.filter(s => s.category === 'massage').length,
      nail: data.filter(s => s.category === 'nail').length,
      spa: data.filter(s => s.category === 'spa').length,
    }
  }

  return stats
}

// Search services
export async function searchServices(query: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .or(`name_th.ilike.%${query}%,name_en.ilike.%${query}%,description_th.ilike.%${query}%,description_en.ilike.%${query}%`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error searching services:', error)
    throw error
  }

  return data as Service[]
}