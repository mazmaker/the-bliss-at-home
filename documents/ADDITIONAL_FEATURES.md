# The Bliss at Home - Additional Features & Special Requirements

เอกสารเพิ่มเติมสำหรับฟีเจอร์พิเศษและข้อกำหนดที่สำคัญ

---

## 🎵 Staff App - Sound/Music Features

### เสียงเพลงเมื่อเริ่ม/จบบริการ

**Requirement:**
เมื่อหมอนวดกดปุ่ม "เริ่มบริการ" ระบบจะเล่นเสียงเพลงดัง และหยุดเพลงเมื่อกดปุ่ม "เสร็จสิ้นบริการ"

**Technical Implementation:**

```typescript
// apps/provider/src/hooks/useServiceSound.ts
import { useEffect, useRef, useState } from 'react'

export const useServiceSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio('/sounds/service-music.mp3')
    audioRef.current.loop = true // Loop the music
    audioRef.current.volume = 0.7 // Set volume to 70%
    
    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
  
  const startMusic = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play()
        setIsPlaying(true)
        
        // Vibrate phone
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
      }
    } catch (error) {
      console.error('Failed to play music:', error)
    }
  }
  
  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }
  
  return { startMusic, stopMusic, isPlaying }
}
```

**Usage in Component:**

```typescript
// apps/provider/src/pages/JobDetails.tsx
import { useServiceSound } from '../hooks/useServiceSound'

export const JobDetails = ({ job }) => {
  const { startMusic, stopMusic, isPlaying } = useServiceSound()
  const { mutate: updateJobStatus } = useUpdateJobStatus()
  
  const handleStartService = () => {
    updateJobStatus({
      jobId: job.id,
      status: 'IN_PROGRESS'
    }, {
      onSuccess: () => {
        startMusic() // Play music when service starts
      }
    })
  }
  
  const handleCompleteService = () => {
    stopMusic() // Stop music before completing
    updateJobStatus({
      jobId: job.id,
      status: 'COMPLETED'
    })
  }
  
  return (
    <div>
      {/* Job details */}
      
      {job.status === 'ASSIGNED' && (
        <button onClick={handleStartService}>
          เริ่มบริการ
        </button>
      )}
      
      {job.status === 'IN_PROGRESS' && (
        <>
          {isPlaying && (
            <div className="flex items-center gap-2 text-green-600">
              <span>🎵</span>
              <span>กำลังให้บริการ...</span>
            </div>
          )}
          <button onClick={handleCompleteService}>
            เสร็จสิ้นบริการ
          </button>
        </>
      )}
    </div>
  )
}
```

**Music File:**
- Location: `apps/provider/public/sounds/service-music.mp3`
- Format: MP3, 128kbps
- Duration: 2-3 minutes (looped)
- Style: Relaxing spa music / Thai traditional music

**Considerations:**
- ต้องขออนุญาต Autoplay จากผู้ใช้ (browser policy)
- รองรับการปิดเสียงโดยผู้ใช้
- เก็บ preference ว่าผู้ใช้ต้องการเสียงหรือไม่
- ทำงานได้แม้หน้าจอปิด (background mode)

---

## 🚨 SOS Emergency Button

### Overview
ปุ่ม SOS สำหรับสถานการณ์ฉุกเฉิน มีใน 2 แอพ:
1. **Customer App** - สำหรับลูกค้าขอความช่วยเหลือฉุกเฉิน
2. **Staff App** - สำหรับหมอนวดขอความช่วยเหลือฉุกเฉิน

### Technical Implementation

#### 1. Backend - SOS Alert System

**Database Model:**

```prisma
// apps/api/prisma/schema.prisma

model SOSAlert {
  id              String    @id @default(cuid())
  alertCode       String    @unique // SOS-YYYYMMDD-XXXX
  
  // Who triggered
  triggeredBy     String    // User ID
  userRole        UserRole  // CUSTOMER or PROVIDER
  user            User      @relation(fields: [triggeredBy], references: [id])
  
  // Related booking
  bookingId       String?
  booking         Booking?  @relation(fields: [bookingId], references: [id])
  
  // Location
  latitude        Float
  longitude       Float
  address         String
  
  // Status
  status          SOSStatus @default(ACTIVE)
  severity        SOSSeverity @default(HIGH)
  
  // Details
  message         String?
  attachments     String[]  // URLs to photos/videos
  
  // Response
  respondedBy     String?   // Admin ID
  respondedAt     DateTime?
  responseNotes   String?
  
  // Timeline
  triggeredAt     DateTime  @default(now())
  resolvedAt      DateTime?
  
  // Notifications sent
  notificationsSent String[] // Array of notification IDs
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([triggeredBy])
  @@index([bookingId])
  @@index([status])
  @@index([triggeredAt])
}

enum SOSStatus {
  ACTIVE          // กำลังดำเนินการ
  RESPONDED       // มีการตอบสนอง
  RESOLVED        // แก้ไขเสร็จสิ้น
  FALSE_ALARM     // แจ้งเตือนผิดพลาด
}

enum SOSSeverity {
  HIGH            // ฉุกเฉินมาก
  MEDIUM          // ฉุกเฉินปานกลาง
  LOW             // ไม่ฉุกเฉิน
}
```

**API Endpoints:**

```typescript
// apps/api/src/routes/sos.routes.ts

router.post('/sos/trigger', authenticate, async (req, res) => {
  // Trigger SOS alert
})

router.get('/sos/alerts', authenticate, authorize('ADMIN'), async (req, res) => {
  // List all SOS alerts
})

router.get('/sos/alerts/:id', authenticate, async (req, res) => {
  // Get SOS alert details
})

router.patch('/sos/alerts/:id/respond', authenticate, authorize('ADMIN'), async (req, res) => {
  // Admin responds to SOS
})

router.patch('/sos/alerts/:id/resolve', authenticate, authorize('ADMIN'), async (req, res) => {
  // Resolve SOS alert
})
```

**Service Implementation:**

```typescript
// apps/api/src/services/sos.service.ts

export const sosService = {
  async triggerAlert(data: {
    userId: string
    userRole: UserRole
    bookingId?: string
    latitude: number
    longitude: number
    address: string
    message?: string
    attachments?: string[]
  }) {
    // Create SOS alert
    const alert = await prisma.sOSAlert.create({
      data: {
        alertCode: `SOS-${format(new Date(), 'yyyyMMdd')}-${generateCode()}`,
        triggeredBy: data.userId,
        userRole: data.userRole,
        bookingId: data.bookingId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        message: data.message,
        attachments: data.attachments || [],
        status: 'ACTIVE',
        severity: 'HIGH',
        triggeredAt: new Date()
      },
      include: {
        user: true,
        booking: {
          include: {
            service: true,
            provider: true,
            customer: true
          }
        }
      }
    })
    
    // Send notifications to all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })
    
    const notifications = await Promise.all(
      admins.map(admin => 
        notificationService.sendSOSAlert(admin.id, alert)
      )
    )
    
    // Send LINE notification to admins
    await lineService.sendSOSAlertToAdmins(alert)
    
    // Send email to emergency contacts
    await emailService.sendSOSAlert(alert)
    
    // Update with notification IDs
    await prisma.sOSAlert.update({
      where: { id: alert.id },
      data: {
        notificationsSent: notifications.map(n => n.id)
      }
    })
    
    return alert
  },
  
  async getAlerts(filters: {
    status?: SOSStatus
    userRole?: UserRole
    startDate?: Date
    endDate?: Date
  }) {
    return prisma.sOSAlert.findMany({
      where: {
        status: filters.status,
        userRole: filters.userRole,
        triggeredAt: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      include: {
        user: true,
        booking: {
          include: {
            service: true,
            provider: true,
            customer: true
          }
        }
      },
      orderBy: {
        triggeredAt: 'desc'
      }
    })
  },
  
  async respondToAlert(alertId: string, adminId: string, notes?: string) {
    return prisma.sOSAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESPONDED',
        respondedBy: adminId,
        respondedAt: new Date(),
        responseNotes: notes
      }
    })
  },
  
  async resolveAlert(alertId: string, adminId: string, notes?: string) {
    return prisma.sOSAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        respondedBy: adminId,
        resolvedAt: new Date(),
        responseNotes: notes
      }
    })
  }
}
```

#### 2. Customer App - SOS Button

```typescript
// apps/customer/src/components/SOSButton.tsx

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useSOSAlert } from '../hooks/useSOSAlert'

interface SOSButtonProps {
  bookingId?: string
  position?: 'fixed' | 'relative'
}

export const SOSButton: React.FC<SOSButtonProps> = ({ 
  bookingId,
  position = 'fixed' 
}) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const { triggerSOS, isTriggering } = useSOSAlert()
  
  const handleTrigger = async () => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await triggerSOS({
            bookingId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            message
          })
          
          setShowConfirm(false)
          setMessage('')
        },
        (error) => {
          console.error('Failed to get location:', error)
          // Still trigger with default location
          triggerSOS({
            bookingId,
            latitude: 0,
            longitude: 0,
            message
          })
        }
      )
    }
  }
  
  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h3 className="text-xl font-bold">แจ้งเหตุฉุกเฉิน</h3>
          </div>
          
          <p className="text-gray-600 mb-4">
            คุณต้องการส่งสัญญาณฉุกเฉินไปยังผู้ดูแลระบบหรือไม่?
            เราจะส่งตำแหน่งของคุณและรายละเอียดการจองไปให้
          </p>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            rows={3}
          />
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isTriggering}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleTrigger}
              disabled={isTriggering}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isTriggering ? 'กำลังส่ง...' : 'ยืนยัน SOS'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`
        ${position === 'fixed' ? 'fixed bottom-4 right-4' : ''}
        flex items-center gap-2 px-4 py-3
        bg-red-600 text-white rounded-full shadow-lg
        hover:bg-red-700 transition-colors
        animate-pulse
      `}
    >
      <AlertCircle className="w-5 h-5" />
      <span className="font-medium">SOS</span>
    </button>
  )
}
```

**Custom Hook:**

```typescript
// apps/customer/src/hooks/useSOSAlert.ts

import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { toast } from 'sonner'

export const useSOSAlert = () => {
  const { mutate: triggerSOS, isPending: isTriggering } = useMutation({
    mutationFn: async (data: {
      bookingId?: string
      latitude: number
      longitude: number
      message?: string
    }) => {
      // Get address from coordinates
      const address = await getAddressFromCoordinates(
        data.latitude, 
        data.longitude
      )
      
      const response = await api.post('/sos/trigger', {
        ...data,
        address
      })
      
      return response.data.data
    },
    onSuccess: () => {
      toast.success('ส่งสัญญาณ SOS แล้ว', {
        description: 'ทีมงานจะติดต่อคุณในเร็วๆ นี้'
      })
    },
    onError: (error: any) => {
      toast.error('ไม่สามารถส่งสัญญาณได้', {
        description: error.response?.data?.error?.message || 'กรุณาลองใหม่อีกครั้ง'
      })
    }
  })
  
  return { triggerSOS, isTriggering }
}
```

#### 3. Staff App - SOS Button

```typescript
// apps/provider/src/components/SOSButton.tsx
// Similar to Customer App but with LIFF integration

import liff from '@line/liff'

export const SOSButton: React.FC<SOSButtonProps> = ({ jobId }) => {
  // ... same as Customer App
  
  const handleTrigger = async () => {
    // Get location from LIFF
    try {
      const location = await liff.getLocation()
      
      await triggerSOS({
        bookingId: jobId,
        latitude: location.latitude,
        longitude: location.longitude,
        message
      })
    } catch (error) {
      // Fallback to web geolocation
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await triggerSOS({
            bookingId: jobId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            message
          })
        }
      )
    }
  }
  
  // ... rest same as Customer App
}
```

#### 4. Admin App - SOS Alert Management

```typescript
// apps/admin/src/pages/SOSAlerts.tsx

export const SOSAlertsPage = () => {
  const [filter, setFilter] = useState<SOSStatus>('ACTIVE')
  const { data: alerts, isLoading } = useSOSAlerts({ status: filter })
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SOS Alerts</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={filter === 'ACTIVE' ? 'active' : ''}
          >
            Active ({alerts?.filter(a => a.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setFilter('RESPONDED')}
            className={filter === 'RESPONDED' ? 'active' : ''}
          >
            Responded
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={filter === 'RESOLVED' ? 'active' : ''}
          >
            Resolved
          </button>
        </div>
      </div>
      
      {/* Active alerts with urgent styling */}
      {alerts?.filter(a => a.status === 'ACTIVE').map(alert => (
        <div key={alert.id} className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4 animate-pulse">
          <SOSAlertCard alert={alert} />
        </div>
      ))}
      
      {/* Other alerts */}
      {alerts?.filter(a => a.status !== 'ACTIVE').map(alert => (
        <SOSAlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
```

### Notification Strategy

**1. Real-time Notification (WebSocket):**
```typescript
// Push to all admin clients immediately
socket.to('admin-room').emit('sos:triggered', alert)
```

**2. LINE Notification:**
```typescript
// Send to admin LINE group
await lineService.pushMessage(ADMIN_LINE_GROUP_ID, {
  type: 'flex',
  altText: '🚨 SOS Alert!',
  contents: {
    // Flex message with alert details
  }
})
```

**3. Email Notification:**
```typescript
// Send to emergency email list
await emailService.send({
  to: ['admin@thebliss.com', 'support@thebliss.com'],
  subject: '🚨 SOS Alert - Immediate Action Required',
  html: sosAlertTemplate(alert)
})
```

**4. SMS Notification (Optional):**
```typescript
// For critical alerts
await smsService.send({
  to: '+66812345678',
  message: `SOS Alert: ${alert.alertCode}. User: ${alert.user.name}. Location: ${alert.address}`
})
```

---

## 🎨 UI/UX Considerations

### SOS Button Placement

**Customer App:**
- Fixed position: Bottom right corner
- Always visible on booking detail page
- Hidden on other pages unless there's an active booking

**Staff App:**
- Fixed position: Bottom right corner
- Always visible when there's an active job
- Prominent on job details page

**Visual Design:**
- Red color (#DC2626)
- Pulsing animation to draw attention
- Icon: AlertCircle or similar emergency symbol
- Clear label: "SOS" or "ฉุกเฉิน"

### Confirmation Dialog

**Must include:**
- Clear warning message
- Optional text input for details
- Cancel button (easy to dismiss false triggers)
- Confirm button (prominent, red)
- Privacy notice about location sharing

---

## 📱 Testing Checklist

### SOS Feature Testing

- [ ] SOS button visible in correct locations
- [ ] Confirmation dialog displays correctly
- [ ] Location permission requested properly
- [ ] Location captured accurately
- [ ] Alert created in database
- [ ] Admin notifications sent (WebSocket, LINE, Email)
- [ ] Admin can view alert details
- [ ] Admin can respond to alert
- [ ] Admin can resolve alert
- [ ] False alarm handling works
- [ ] Works offline (queue and retry)
- [ ] Works on both iOS and Android (LIFF)

### Sound Feature Testing

- [ ] Music plays when service starts
- [ ] Music loops correctly
- [ ] Music stops when service completes
- [ ] Volume control works
- [ ] User can disable/enable sound in settings
- [ ] Works with phone in silent mode
- [ ] Works with screen off (background audio)
- [ ] No audio conflict with other apps
- [ ] Preference persists across sessions

---

## 🔧 Configuration

### Environment Variables

```bash
# Sound Feature
VITE_SERVICE_MUSIC_URL=/sounds/service-music.mp3
VITE_ENABLE_SERVICE_SOUND=true

# SOS Feature
ADMIN_LINE_GROUP_ID=xxx
SOS_EMAIL_RECIPIENTS=admin@thebliss.com,support@thebliss.com
SOS_SMS_ENABLED=true
SOS_SMS_RECIPIENTS=+66812345678,+66898765432

# Emergency Contacts
EMERGENCY_CONTACT_PHONE=1669
EMERGENCY_CONTACT_EMAIL=emergency@thebliss.com
```

---

## 📊 Analytics & Monitoring

### Metrics to Track

**SOS Alerts:**
- Total alerts per day/week/month
- Average response time
- False alarm rate
- Resolution time
- Alert sources (Customer vs Provider)
- Geographic distribution

**Sound Feature:**
- Usage rate (% of providers who use it)
- User preferences (enabled/disabled)
- Technical issues (failed to play)

---

## 🚀 Future Enhancements

### SOS Feature
1. **Video Call Integration** - Allow admin to start video call with user
2. **Panic Mode** - Silent alert without confirmation dialog (hold button 3 sec)
3. **Emergency Services Integration** - Auto-call 1669 if needed
4. **Location Tracking** - Continuous location updates during active alert
5. **Emergency Contact** - Allow users to add personal emergency contacts

### Sound Feature
1. **Music Library** - Let providers choose from multiple tracks
2. **Spotify Integration** - Connect to Spotify account
3. **Timer** - Auto-stop music after X minutes
4. **Voice Announcement** - "Service starting" / "Service completed"
5. **Custom Uploads** - Allow providers to upload their own music

---

**This document covers the special requirements not fully detailed in the main specification documents.**

