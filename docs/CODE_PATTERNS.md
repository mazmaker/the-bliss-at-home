# The Bliss Massage at Home - Code Examples & Patterns

ตัวอย่างโค้ดสำหรับ pattern ต่างๆ ที่ใช้บ่อยในโปรเจกต์

---

## 📁 Backend Examples

### 1. API Controller Pattern

**apps/api/src/controllers/booking.controller.ts:**
```typescript
import { Request, Response } from 'express'
import { bookingService } from '../services/booking.service'
import { CreateBookingSchema, UpdateBookingSchema } from '../validators/booking.validator'
import { catchAsync } from '../utils/catchAsync'
import { ApiResponse } from '../types/api'

export const bookingController = {
  // Get all bookings
  getAll: catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query
    
    const result = await bookingService.getBookings({
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      userId: req.user!.id,
      userRole: req.user!.role
    })
    
    const response: ApiResponse = {
      success: true,
      data: result.bookings,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    }
    
    res.json(response)
  }),
  
  // Get booking by ID
  getById: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    
    const booking = await bookingService.getBookingById(
      id,
      req.user!.id,
      req.user!.role
    )
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking not found'
        }
      })
    }
    
    res.json({
      success: true,
      data: booking
    })
  }),
  
  // Create booking
  create: catchAsync(async (req: Request, res: Response) => {
    // Validate request body
    const validated = CreateBookingSchema.parse(req.body)
    
    // Create booking
    const booking = await bookingService.createBooking({
      ...validated,
      customerId: req.user!.id
    })
    
    res.status(201).json({
      success: true,
      data: booking
    })
  }),
  
  // Update booking
  update: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const validated = UpdateBookingSchema.parse(req.body)
    
    const booking = await bookingService.updateBooking(
      id,
      validated,
      req.user!.id,
      req.user!.role
    )
    
    res.json({
      success: true,
      data: booking
    })
  }),
  
  // Cancel booking
  cancel: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const { reason } = req.body
    
    const booking = await bookingService.cancelBooking(
      id,
      req.user!.id,
      req.user!.role,
      reason
    )
    
    res.json({
      success: true,
      data: booking
    })
  })
}
```

### 2. Service Layer Pattern

**apps/api/src/services/booking.service.ts:**
```typescript
import { prisma } from '../config/database'
import { Prisma, BookingStatus, UserRole } from '@prisma/client'
import { AppError } from '../utils/AppError'
import { notificationService } from './notification.service'

export const bookingService = {
  async getBookings(params: {
    page: number
    limit: number
    status?: string
    startDate?: string
    endDate?: string
    userId: string
    userRole: UserRole
  }) {
    const { page, limit, status, startDate, endDate, userId, userRole } = params
    
    const skip = (page - 1) * limit
    
    // Build where clause based on user role
    const where: Prisma.BookingWhereInput = {}
    
    if (userRole === UserRole.CUSTOMER) {
      where.customerId = userId
    } else if (userRole === UserRole.HOTEL) {
      where.hotelId = userId
    } else if (userRole === UserRole.PROVIDER) {
      where.providerId = userId
    }
    // ADMIN can see all bookings
    
    if (status) {
      where.status = status as BookingStatus
    }
    
    if (startDate && endDate) {
      where.bookingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          service: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true
            }
          },
          provider: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phoneNumber: true
                }
              }
            }
          },
          hotel: {
            select: {
              id: true,
              hotelName: true
            }
          },
          payment: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.booking.count({ where })
    ])
    
    return {
      bookings,
      total,
      page,
      limit
    }
  },
  
  async getBookingById(
    id: string,
    userId: string,
    userRole: UserRole
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
        addOns: {
          include: {
            addOn: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        provider: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        },
        hotel: true,
        payment: true,
        review: true
      }
    })
    
    if (!booking) {
      return null
    }
    
    // Check authorization
    if (userRole !== UserRole.ADMIN) {
      if (userRole === UserRole.CUSTOMER && booking.customerId !== userId) {
        throw new AppError('Unauthorized', 403)
      }
      if (userRole === UserRole.HOTEL && booking.hotelId !== userId) {
        throw new AppError('Unauthorized', 403)
      }
      if (userRole === UserRole.PROVIDER && booking.providerId !== userId) {
        throw new AppError('Unauthorized', 403)
      }
    }
    
    return booking
  },
  
  async createBooking(data: {
    customerId: string
    serviceId: string
    bookingDate: Date
    startTime: Date
    duration: number
    address: string
    latitude: number
    longitude: number
    addOns?: string[]
    specialNotes?: string
    preferredGender?: string
    promotionCode?: string
  }) {
    // Validate service exists
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId }
    })
    
    if (!service || !service.isActive) {
      throw new AppError('Service not found or inactive', 404)
    }
    
    // Calculate price
    let basePrice = service.basePrice
    let addOnPrice = 0
    
    if (data.addOns && data.addOns.length > 0) {
      const addOns = await prisma.serviceAddOn.findMany({
        where: {
          id: { in: data.addOns }
        }
      })
      addOnPrice = addOns.reduce((sum, addon) => sum + Number(addon.price), 0)
    }
    
    let discount = 0
    if (data.promotionCode) {
      // Validate and apply promotion
      const promotion = await prisma.promotion.findUnique({
        where: { code: data.promotionCode }
      })
      
      if (promotion && promotion.isActive) {
        if (promotion.discountType === 'PERCENTAGE') {
          discount = (Number(basePrice) + addOnPrice) * (Number(promotion.discountValue) / 100)
        } else {
          discount = Number(promotion.discountValue)
        }
      }
    }
    
    const subtotal = Number(basePrice) + addOnPrice - discount
    const tax = subtotal * 0.07 // 7% VAT
    const totalPrice = subtotal + tax
    
    // Calculate end time
    const endTime = new Date(data.startTime)
    endTime.setMinutes(endTime.getMinutes() + data.duration)
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingCode: `BK${Date.now()}`,
        customerId: data.customerId,
        serviceId: data.serviceId,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime,
        duration: data.duration,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        specialNotes: data.specialNotes,
        preferredGender: data.preferredGender,
        basePrice,
        addOnPrice,
        discount,
        tax,
        totalPrice,
        status: BookingStatus.PENDING,
        addOns: data.addOns ? {
          create: data.addOns.map(addOnId => ({
            addOnId
          }))
        } : undefined
      },
      include: {
        service: true,
        customer: true
      }
    })
    
    // Send notification
    await notificationService.sendBookingCreated(booking)
    
    return booking
  },
  
  async updateBooking(
    id: string,
    data: Partial<{
      bookingDate: Date
      startTime: Date
      specialNotes: string
    }>,
    userId: string,
    userRole: UserRole
  ) {
    const booking = await this.getBookingById(id, userId, userRole)
    
    if (!booking) {
      throw new AppError('Booking not found', 404)
    }
    
    // Check if booking can be updated
    if (booking.status === BookingStatus.COMPLETED || 
        booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Cannot update completed or cancelled booking', 400)
    }
    
    // Check time constraint (3 hours before)
    const now = new Date()
    const bookingTime = new Date(booking.startTime)
    const diffHours = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 3) {
      throw new AppError('Cannot update booking less than 3 hours before start time', 400)
    }
    
    const updated = await prisma.booking.update({
      where: { id },
      data,
      include: {
        service: true,
        customer: true
      }
    })
    
    // Send notification
    await notificationService.sendBookingUpdated(updated)
    
    return updated
  },
  
  async cancelBooking(
    id: string,
    userId: string,
    userRole: UserRole,
    reason?: string
  ) {
    const booking = await this.getBookingById(id, userId, userRole)
    
    if (!booking) {
      throw new AppError('Booking not found', 404)
    }
    
    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Booking already cancelled', 400)
    }
    
    // Check time constraint
    const now = new Date()
    const bookingTime = new Date(booking.startTime)
    const diffHours = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 3 && userRole !== UserRole.ADMIN) {
      throw new AppError('Cannot cancel booking less than 3 hours before start time', 400)
    }
    
    const cancelled = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: userId,
        cancellationReason: reason
      },
      include: {
        service: true,
        customer: true,
        payment: true
      }
    })
    
    // Process refund if paid
    if (cancelled.payment && cancelled.payment.status === 'PAID') {
      // TODO: Process refund through Omise
    }
    
    // Send notification
    await notificationService.sendBookingCancelled(cancelled)
    
    return cancelled
  }
}
```

### 3. Middleware Pattern

**apps/api/src/middlewares/auth.ts:**
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { AppError } from '../utils/AppError'
import { UserRole } from '@prisma/client'

interface JWTPayload {
  sub: string
  role: UserRole
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: UserRole
        email: string
      }
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401)
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JWTPayload
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    })
    
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive', 401)
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email
    }
    
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401))
    } else {
      next(error)
    }
  }
}

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401))
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403))
    }
    
    next()
  }
}
```

### 4. Error Handling

**apps/api/src/utils/AppError.ts:**
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}
```

**apps/api/src/middlewares/errorHandler.ts:**
```typescript
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error)
  
  // Handle known errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message,
        details: error.details
      }
    })
  }
  
  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'Record already exists'
        }
      })
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found'
        }
      })
    }
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors
      }
    })
  }
  
  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message
    }
  })
}
```

---

## 🎨 Frontend Examples

### 1. React Component with Hooks

**apps/customer/src/components/BookingCard.tsx:**
```typescript
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react'
import { Booking, BookingStatus } from '@bliss/types'

interface BookingCardProps {
  booking: Booking
  onViewDetails: (id: string) => void
  onCancel?: (id: string) => void
}

export const BookingCard: React.FC<BookingCardProps> = ({ 
  booking, 
  onViewDetails,
  onCancel 
}) => {
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'PENDING': return 'รอชำระเงิน'
      case 'CONFIRMED': return 'ยืนยันแล้ว'
      case 'IN_PROGRESS': return 'กำลังให้บริการ'
      case 'COMPLETED': return 'เสร็จสิ้น'
      case 'CANCELLED': return 'ยกเลิกแล้ว'
      default: return status
    }
  }
  
  const canCancel = () => {
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return false
    }
    
    const now = new Date()
    const bookingTime = new Date(booking.startTime)
    const diffHours = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return diffHours >= 3
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {booking.service.name}
          </h3>
          <p className="text-sm text-gray-500">
            รหัสการจอง: {booking.bookingCode}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
          {getStatusText(booking.status)}
        </span>
      </div>
      
      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            {format(new Date(booking.bookingDate), 'dd MMMM yyyy', { locale: th })}
          </span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span>
            {format(new Date(booking.startTime), 'HH:mm')} - 
            {format(new Date(booking.endTime), 'HH:mm')} น.
          </span>
        </div>
        
        <div className="flex items-start text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{booking.address}</span>
        </div>
        
        <div className="flex items-center text-sm font-medium text-gray-900">
          <DollarSign className="w-4 h-4 mr-2" />
          <span>฿{booking.totalPrice.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(booking.id)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          ดูรายละเอียด
        </button>
        
        {canCancel() && onCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </div>
  )
}
```

### 2. Custom Hook for API

**apps/customer/src/hooks/useBookings.ts:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Booking, CreateBookingDto, BookingFilters } from '@bliss/types'
import { toast } from 'sonner'

export const useBookings = (filters?: BookingFilters) => {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const response = await api.get<{ data: Booking[] }>('/bookings', {
        params: filters
      })
      return response.data.data
    }
  })
}

export const useBooking = (id: string) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get<{ data: Booking }>(`/bookings/${id}`)
      return response.data.data
    },
    enabled: !!id
  })
}

export const useCreateBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateBookingDto) => {
      const response = await api.post<{ data: Booking }>('/bookings', data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('จองบริการสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    }
  })
}

export const useCancelBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.delete(`/bookings/${id}`, {
        data: { reason }
      })
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] })
      toast.success('ยกเลิกการจองสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด')
    }
  })
}
```

### 3. Form with Validation

**apps/customer/src/components/BookingForm.tsx:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Service } from '@bliss/types'
import { useCreateBooking } from '../hooks/useBookings'

const bookingSchema = z.object({
  serviceId: z.string().min(1, 'กรุณาเลือกบริการ'),
  bookingDate: z.date({
    required_error: 'กรุณาเลือกวันที่'
  }),
  startTime: z.string().min(1, 'กรุณาเลือกเวลา'),
  address: z.string().min(10, 'กรุณากรอกที่อยู่อย่างน้อย 10 ตัวอักษร'),
  specialNotes: z.string().optional(),
  preferredGender: z.enum(['MALE', 'FEMALE']).optional()
})

type BookingFormData = z.infer<typeof bookingSchema>

interface BookingFormProps {
  service: Service
  onSuccess: () => void
}

export const BookingForm: React.FC<BookingFormProps> = ({ 
  service, 
  onSuccess 
}) => {
  const { mutate: createBooking, isPending } = useCreateBooking()
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: service.id
    }
  })
  
  const onSubmit = (data: BookingFormData) => {
    createBooking({
      ...data,
      // Convert time string to Date
      startTime: new Date(`${data.bookingDate} ${data.startTime}`),
      duration: service.duration,
      latitude: 0, // TODO: Get from map
      longitude: 0
    }, {
      onSuccess
    })
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Service Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">{service.name}</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>ระยะเวลา: {service.duration} นาที</p>
          <p>ราคา: ฿{service.basePrice.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          วันที่ <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          {...register('bookingDate', { valueAsDate: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.bookingDate && (
          <p className="mt-1 text-sm text-red-600">{errors.bookingDate.message}</p>
        )}
      </div>
      
      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เวลา <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          {...register('startTime')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.startTime && (
          <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
        )}
      </div>
      
      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ที่อยู่ <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('address')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="กรอกที่อยู่สำหรับให้บริการ"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>
      
      {/* Preferred Gender */}
      {service.requiresGender && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เพศผู้ให้บริการที่ต้องการ
          </label>
          <select
            {...register('preferredGender')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ไม่ระบุ</option>
            <option value="MALE">ชาย</option>
            <option value="FEMALE">หญิง</option>
          </select>
        </div>
      )}
      
      {/* Special Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          หมายเหตุเพิ่มเติม
        </label>
        <textarea
          {...register('specialNotes')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ข้อมูลเพิ่มเติมที่ต้องการแจ้ง"
        />
      </div>
      
      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'กำลังจอง...' : 'ยืนยันการจอง'}
      </button>
    </form>
  )
}
```

### 4. State Management with Zustand

**apps/customer/src/store/bookingStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Service, ServiceAddOn, Address } from '@bliss/types'

interface BookingState {
  // Current booking data
  service: Service | null
  addOns: ServiceAddOn[]
  date: Date | null
  time: string | null
  address: Address | null
  preferredGender: 'MALE' | 'FEMALE' | null
  specialNotes: string
  promotionCode: string | null
  
  // Actions
  setService: (service: Service) => void
  toggleAddOn: (addOn: ServiceAddOn) => void
  setDateTime: (date: Date, time: string) => void
  setAddress: (address: Address) => void
  setPreferredGender: (gender: 'MALE' | 'FEMALE' | null) => void
  setSpecialNotes: (notes: string) => void
  setPromotionCode: (code: string | null) => void
  
  // Calculations
  calculateTotal: () => number
  
  // Reset
  reset: () => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      // Initial state
      service: null,
      addOns: [],
      date: null,
      time: null,
      address: null,
      preferredGender: null,
      specialNotes: '',
      promotionCode: null,
      
      // Actions
      setService: (service) => set({ service }),
      
      toggleAddOn: (addOn) => set((state) => {
        const exists = state.addOns.find(a => a.id === addOn.id)
        if (exists) {
          return { addOns: state.addOns.filter(a => a.id !== addOn.id) }
        }
        return { addOns: [...state.addOns, addOn] }
      }),
      
      setDateTime: (date, time) => set({ date, time }),
      
      setAddress: (address) => set({ address }),
      
      setPreferredGender: (gender) => set({ preferredGender: gender }),
      
      setSpecialNotes: (notes) => set({ specialNotes: notes }),
      
      setPromotionCode: (code) => set({ promotionCode: code }),
      
      calculateTotal: () => {
        const state = get()
        if (!state.service) return 0
        
        const basePrice = Number(state.service.basePrice)
        const addOnPrice = state.addOns.reduce(
          (sum, addon) => sum + Number(addon.price), 
          0
        )
        
        // TODO: Apply promotion discount
        
        const subtotal = basePrice + addOnPrice
        const tax = subtotal * 0.07 // 7% VAT
        
        return subtotal + tax
      },
      
      reset: () => set({
        service: null,
        addOns: [],
        date: null,
        time: null,
        address: null,
        preferredGender: null,
        specialNotes: '',
        promotionCode: null
      })
    }),
    {
      name: 'booking-storage'
    }
  )
)
```

---

## 🔌 Integration Examples

### 1. Omise Payment

**apps/api/src/services/payment.service.ts:**
```typescript
import Omise from 'omise'
import { prisma } from '../config/database'

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!
})

export const paymentService = {
  async createCharge(bookingId: string, tokenId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, customer: true }
    })
    
    if (!booking) {
      throw new Error('Booking not found')
    }
    
    const amount = Math.round(Number(booking.totalPrice) * 100) // Convert to satang
    
    const charge = await omise.charges.create({
      amount,
      currency: 'THB',
      card: tokenId,
      description: `Booking #${booking.bookingCode}`,
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
        serviceType: booking.service.category
      },
      return_uri: `${process.env.FRONTEND_URL}/booking/payment/callback`
    })
    
    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        omiseChargeId: charge.id,
        amount: booking.totalPrice,
        currency: 'THB',
        method: 'CREDIT_CARD',
        status: charge.status === 'successful' ? 'PAID' : 'PENDING',
        cardBrand: charge.card?.brand,
        cardLastDigits: charge.card?.last_digits
      }
    })
    
    return { charge, payment }
  }
}
```

**Frontend Integration:**
```typescript
// apps/customer/src/services/omise.ts
import { loadScript } from '@bliss/utils'

let OmiseCard: any = null

export const initializeOmise = async () => {
  if (OmiseCard) return OmiseCard
  
  await loadScript('https://cdn.omise.co/omise.js')
  
  OmiseCard = (window as any).OmiseCard
  OmiseCard.configure({
    publicKey: import.meta.env.VITE_OMISE_PUBLIC_KEY,
    image: '/logo.png',
    frameLabel: 'The Bliss Massage at Home',
    submitLabel: 'ชำระเงิน',
    buttonLabel: 'ชำระด้วยบัตร'
  })
  
  return OmiseCard
}

export const createToken = (cardData: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    OmiseCard.open({
      amount: cardData.amount,
      currency: 'THB',
      onCreateTokenSuccess: (token: string) => {
        resolve(token)
      },
      onFormClosed: () => {
        reject(new Error('Payment cancelled'))
      }
    })
  })
}
```

### 2. LINE Notification

**apps/api/src/services/line.service.ts:**
```typescript
import { Client } from '@line/bot-sdk'

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!
})

export const lineService = {
  async sendJobNotification(lineUserId: string, booking: any) {
    const message = {
      type: 'flex' as const,
      altText: '🔔 งานใหม่!',
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: booking.service.imageUrl,
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 งานใหม่!',
              weight: 'bold',
              size: 'xl',
              color: '#1DB446'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: booking.service.name,
                  size: 'lg',
                  weight: 'bold',
                  wrap: true
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📅',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: new Date(booking.bookingDate).toLocaleDateString('th-TH'),
                      size: 'sm',
                      color: '#666666',
                      flex: 5
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '⏰',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: new Date(booking.startTime).toLocaleTimeString('th-TH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }),
                      size: 'sm',
                      color: '#666666',
                      flex: 5
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📍',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: booking.address,
                      size: 'sm',
                      color: '#666666',
                      flex: 5,
                      wrap: true
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '💰',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: `฿${booking.totalPrice.toLocaleString()}`,
                      size: 'sm',
                      color: '#666666',
                      flex: 5
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `${process.env.LIFF_URL}/jobs/${booking.id}`
              }
            }
          ]
        }
      }
    }
    
    await client.pushMessage(lineUserId, message)
  }
}
```

---

**เอกสารนี้จัดทำขึ้นเพื่อให้คุณมีตัวอย่างโค้ดที่พร้อมใช้งานสำหรับการพัฒนาใน Claude Code** 🚀
