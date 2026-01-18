import { useState } from 'react'
import { User, Mail, Phone, MapPin, Camera, Edit, Check, X } from 'lucide-react'

function StaffProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: 'สมหญิง นวดเก่ง',
    nameEn: 'Somying Massage',
    email: 'somying@email.com',
    phone: '081-234-5678',
    address: '123 ถนนสุขุมวิท ปทุมวัน กรุงเทพฯ 10110',
    idCard: '1234567890123',
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '012-3-45678-9',
    bio: 'มีประสบการณ์ด้านนวดไทยมากกว่า 10 ปี สามารถนวดได้ทั้งแบบกษัตริย์และแบบทั่วไป เชี่ยวชาญด้านนวดระบายปวดกระดูกและกล้ามเนื้อ',
  })

  const skills = [
    { name: 'นวดไทย', nameEn: 'Thai Massage', level: 5 },
    { name: 'นวดน้ำมัน', nameEn: 'Oil Massage', level: 4 },
    { name: 'นวดเท้า', nameEn: 'Foot Massage', level: 5 },
    { name: 'สปา', nameEn: 'Spa', level: 3 },
  ]

  const stats = {
    totalJobs: 1250,
    totalEarnings: 450000,
    rating: 4.8,
    reviews: 567,
    joinedDate: '2024-01-15',
  }

  const handleSave = () => {
    console.log('Saving profile:', profile)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const renderSkillLevel = (level: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className={`w-6 h-1.5 rounded-full ${
              star <= level ? 'bg-amber-500' : 'bg-stone-200'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">โปรไฟล์</h1>
          <p className="text-stone-500">Profile</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 bg-white rounded-lg shadow"
          >
            <Edit className="w-5 h-5 text-stone-600" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="p-2 bg-stone-100 rounded-lg"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
            <button
              onClick={handleSave}
              className="p-2 bg-amber-700 rounded-lg"
            >
              <Check className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-700 to-amber-800 p-6 text-white">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold mb-2">
                ส
              </div>
              {!isEditing && (
                <button className="absolute bottom-2 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4 text-stone-600" />
                </button>
              )}
            </div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-sm opacity-90">{profile.nameEn}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-300">★</span>
              <span className="font-semibold">{stats.rating}</span>
              <span className="text-sm opacity-80">({stats.reviews} รีวิว)</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Bio */}
          <div>
            <p className="text-sm text-stone-600 leading-relaxed">{profile.bio}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 py-4 border-y border-stone-100">
            <div className="text-center">
              <p className="text-xl font-bold text-stone-900">{stats.totalJobs}</p>
              <p className="text-xs text-stone-500">งานที่ทำ</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">
                ฿{(stats.totalEarnings / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-stone-500">รายได้รวม</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">{stats.rating}</p>
              <p className="text-xs text-stone-500">คะแนน</p>
            </div>
          </div>

          {/* Personal Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-900">ข้อมูลส่วนตัว</h3>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ชื่อ-นามสกุล</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">อีเมล</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">เบอร์โทรศัพท์</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-stone-400" />
              <div className="flex-1">
                <p className="text-xs text-stone-500">ที่อยู่</p>
                {isEditing ? (
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-900">{profile.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <h3 className="font-semibold text-stone-900">ข้อมูลธนาคาร</h3>
            <div className="bg-stone-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">ธนาคาร</span>
                <span className="text-sm font-medium text-stone-900">{profile.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-stone-500">เลขที่บัญชี</span>
                <span className="text-sm font-mono font-medium text-stone-900">{profile.bankAccount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-semibold text-stone-900 mb-4">ทักษะ</h3>
        <div className="space-y-3">
          {skills.map((skill) => (
            <div key={skill.name}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-stone-900">{skill.name}</p>
                  <p className="text-xs text-stone-500">{skill.nameEn}</p>
                </div>
              </div>
              {renderSkillLevel(skill.level)}
            </div>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-semibold text-stone-900 mb-3">ข้อมูลบัญชี</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">เลขบัตรประชาชน</span>
            <span className="font-mono text-stone-900">***-***-***3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">วันที่เริ่มใช้งาน</span>
            <span className="text-stone-900">{stats.joinedDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffProfile
