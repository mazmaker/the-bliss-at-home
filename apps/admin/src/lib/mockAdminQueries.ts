/**
 * Mock Admin Queries - สำหรับ Development
 * ข้อมูลจำลองสำหรับทดสอบ Admin Dashboard
 */

import { USE_MOCK_AUTH } from './mockAuth'
import {
  getAdminStats as realGetAdminStats,
  getRecentBookings as realGetRecentBookings,
  getPendingStaffApplications as realGetPendingStaffApplications,
  getPopularServices as realGetPopularServices,
  getAllServices as realGetAllServices,
  type AdminStats,
  type RecentBooking,
  type PendingStaffApplication
} from './adminQueries'

// Mock Data
const mockAdminStats: AdminStats = {
  todaySales: 15750.00,
  todayBookings: 12,
  totalStaff: 8,
  activeHotels: 3
}

const mockRecentBookings: RecentBooking[] = [
  {
    id: 'BK001',
    customer_name: 'นางสาวมาลี ใจดี',
    service_name: 'นวดไทยแบบดั้งเดิม',
    hotel_name: 'โรงแรม The Grand Palace',
    scheduled_date: '2026-01-21',
    scheduled_time: '14:00',
    total_amount: 800,
    status: 'confirmed'
  },
  {
    id: 'BK002',
    customer_name: 'นายสมชาย รักสุขภาพ',
    service_name: 'นวดน้ำมันอโรมา',
    hotel_name: 'โรงแรม Bliss Resort',
    scheduled_date: '2026-01-21',
    scheduled_time: '15:30',
    total_amount: 1000,
    status: 'completed'
  },
  {
    id: 'BK003',
    customer_name: 'นางสาวสุดา สวยงาม',
    service_name: 'เจลเล็บมือ',
    hotel_name: null,
    scheduled_date: '2026-01-21',
    scheduled_time: '16:00',
    total_amount: 450,
    status: 'pending'
  }
]

const mockPendingStaffApplications: PendingStaffApplication[] = [
  {
    id: 'staff-001',
    full_name: 'นางสาววิมล นวดดี',
    skills: ['นวดไทย', 'นวดน้ำมัน', 'รีเฟลกโซโลยี'],
    experience_years: 5,
    rating: 4.8,
    applied_date: '2026-01-20'
  },
  {
    id: 'staff-002',
    full_name: 'นายธนากร ช่างเล็บ',
    skills: ['เจลเล็บ', 'ทำเล็บ', 'ตกแต่งเล็บ'],
    experience_years: 3,
    rating: 4.5,
    applied_date: '2026-01-19'
  }
]

const mockPopularServices = [
  {
    name: 'นวดไทยแบบดั้งเดิม',
    bookings: 25,
    revenue: 20000
  },
  {
    name: 'นวดน้ำมันอโรมา',
    bookings: 18,
    revenue: 18000
  },
  {
    name: 'เจลเล็บมือ',
    bookings: 15,
    revenue: 6750
  },
  {
    name: 'ทรีตเมนท์หน้า',
    bookings: 12,
    revenue: 14400
  }
]

// Export functions ที่เลือก Mock หรือ Real ตาม USE_MOCK_AUTH
export async function getAdminStats(): Promise<AdminStats> {
  if (USE_MOCK_AUTH) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return mockAdminStats
  }
  return realGetAdminStats()
}

export async function getRecentBookings(limit: number = 10): Promise<RecentBooking[]> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockRecentBookings.slice(0, limit)
  }
  return realGetRecentBookings(limit)
}

export async function getPendingStaffApplications(): Promise<PendingStaffApplication[]> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return mockPendingStaffApplications
  }
  return realGetPendingStaffApplications()
}

export async function getPopularServices(limit: number = 5) {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 350))
    return mockPopularServices.slice(0, limit)
  }
  return realGetPopularServices(limit)
}

export async function getAllServices() {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return [
      {
        id: 'service-001',
        name_th: 'นวดไทยแบบดั้งเดิม',
        name_en: 'Traditional Thai Massage',
        category: 'massage',
        duration: 120,
        base_price: 800,
        hotel_price: 640,
        is_active: true,
        sort_order: 1
      },
      {
        id: 'service-002',
        name_th: 'นวดน้ำมันอโรมา',
        name_en: 'Aromatherapy Oil Massage',
        category: 'massage',
        duration: 120,
        base_price: 1000,
        hotel_price: 800,
        is_active: true,
        sort_order: 2
      },
      {
        id: 'service-003',
        name_th: 'เจลเล็บมือ',
        name_en: 'Hand Gel Manicure',
        category: 'nail',
        duration: 60,
        base_price: 450,
        hotel_price: 360,
        is_active: true,
        sort_order: 3
      }
    ]
  }
  return realGetAllServices()
}