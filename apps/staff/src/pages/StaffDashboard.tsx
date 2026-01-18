import { useState } from 'react'
import { MapPin, Clock, User, Phone, Navigation, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function StaffDashboard() {
  const [currentJob, setCurrentJob] = useState<any>(null)

  // Mock data for staff member
  const staffInfo = {
    name: 'สมหญิง นวดเก่ง',
    status: 'available',
    todayJobs: 5,
    todayEarnings: 3200,
    completedJobs: 3,
    rating: 4.8,
  }

  // Mock jobs for today
  const jobs = [
    {
      id: 'JOB001',
      customer: 'John Smith',
      hotel: 'โรงแรมฮิลตัน',
      room: '1505',
      service: 'Thai Massage (2 hours)',
      address: '123 ถนนสุขุมวิท ปทุมวัน',
      time: '14:00',
      duration: 120,
      amount: 640,
      status: 'pending',
      distance: 2.5,
    },
    {
      id: 'JOB002',
      customer: 'Jane Doe',
      hotel: null,
      address: '456 ถนนสีลม สีลม',
      service: 'Oil Massage (2 hours)',
      time: '16:30',
      duration: 120,
      amount: 800,
      status: 'confirmed',
      distance: 1.2,
    },
    {
      id: 'JOB003',
      customer: 'Robert Chen',
      hotel: 'รีสอร์ทในฝัน',
      room: '302',
      service: 'Foot Massage',
      address: '789 ถนนพระราม 3 บางนา',
      time: '18:00',
      duration: 60,
      amount: 320,
      status: 'completed',
      distance: 0,
    },
  ]

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      'in-progress': 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    }
    const labels = {
      pending: 'รอมอบหมาย',
      confirmed: 'ยืนยันแล้ว',
      'in-progress': 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const handleAcceptJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (job) {
      setCurrentJob(job)
    }
  }

  const handleStartJob = () => {
    if (currentJob) {
      console.log('Starting job:', currentJob.id)
    }
  }

  const handleCompleteJob = () => {
    if (currentJob) {
      console.log('Completing job:', currentJob.id)
      setCurrentJob(null)
    }
  }

  const handleCancelJob = () => {
    setCurrentJob(null)
  }

  return (
    <div className="space-y-4">
      {/* Staff Info Card */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-4 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            ส
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{staffInfo.name}</h2>
            <p className="text-sm opacity-90">
              {staffInfo.status === 'available' ? 'พร้อมรับงาน' : 'ไม่ว่าง'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{staffInfo.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-stone-900">{staffInfo.todayJobs}</p>
          <p className="text-xs text-stone-500">งานวันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            ฿{staffInfo.todayEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">รายได้วันนี้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{staffInfo.completedJobs}</p>
          <p className="text-xs text-stone-500">เสร็จสิ้น</p>
        </div>
      </div>

      {/* Current Job (if any) */}
      {currentJob && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
          <div className="bg-gradient-to-r from-purple-700 to-purple-800 text-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">กำลังดำเนินการ</span>
            </div>
            <p className="text-2xl font-bold">{currentJob.service}</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div>
                <p className="text-sm text-stone-500">ลูกค้า</p>
                <p className="font-medium text-stone-900">{currentJob.customer}</p>
              </div>
            </div>
            {currentJob.hotel && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">สถานที่</p>
                  <p className="font-medium text-stone-900">{currentJob.hotel} ห้อง {currentJob.room}</p>
                </div>
              </div>
            )}
            {!currentJob.hotel && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-stone-400" />
                <div className="flex-1">
                  <p className="text-sm text-stone-500">ที่อยู่</p>
                  <p className="font-medium text-stone-900">{currentJob.address}</p>
                </div>
                <button className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-stone-400" />
              <button className="font-medium text-amber-700">โทรติดต่อลูกค้า</button>
            </div>
          </div>
          <div className="flex gap-2 p-4 pt-0">
            <button
              onClick={handleCompleteJob}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              เสร็จสิ้นงาน
            </button>
            <button
              onClick={handleCancelJob}
              className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Available Jobs */}
      <div>
        <h3 className="font-semibold text-stone-900 mb-3">งานที่รอมอบหมาย</h3>
        <div className="space-y-3">
          {jobs.filter((j) => j.status === 'pending' || j.status === 'confirmed').map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-stone-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-stone-900">{job.service}</h4>
                  <p className="text-sm text-stone-500">
                    {job.time} • {job.duration} นาที
                  </p>
                </div>
                {getStatusBadge(job.status)}
              </div>

              <div className="space-y-2 mb-3 text-sm">
                <div className="flex items-center gap-2 text-stone-600">
                  <User className="w-4 h-4" />
                  <span>{job.customer}</span>
                </div>
                {job.hotel ? (
                  <div className="flex items-center gap-2 text-stone-600">
                    <MapPin className="w-4 h-4" />
                    <span>{job.hotel} ห้อง {job.room}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-stone-600">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span className="flex-1">{job.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-stone-600">
                  <Navigation className="w-4 h-4" />
                  <span>{job.distance} กม.</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-amber-700">฿{job.amount}</p>
                {job.status === 'pending' && (
                  <button
                    onClick={() => handleAcceptJob(job.id)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium text-sm"
                  >
                    รับงาน
                  </button>
                )}
                {job.status === 'confirmed' && (
                  <button
                    onClick={() => handleStartJob()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm flex items-center gap-1"
                  >
                    <Navigation className="w-4 h-4" />
                    เริ่มเดินทาง
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Jobs */}
      {jobs.filter((j) => j.status === 'completed').length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900 mb-3">เสร็จสิ้นแล้ว</h3>
          <div className="space-y-3">
            {jobs.filter((j) => j.status === 'completed').map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 border border-stone-100 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-stone-900">{job.service}</h4>
                    <p className="text-sm text-stone-500">{job.time} • {job.customer}</p>
                  </div>
                  <p className="font-bold text-green-600">+฿{job.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffDashboard
