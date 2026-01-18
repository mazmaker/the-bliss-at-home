import { useState } from 'react'
import { Save, Building, MapPin, Phone, Mail, User, Edit, Check } from 'lucide-react'

function HotelProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [hotelData, setHotelData] = useState({
    name: 'โรงแรมฮิลตัน อยุธยา',
    nameEn: 'Hilton Bangkok',
    contactPerson: 'สมศรี มั่งมี',
    email: 'reservations@hilton.com',
    phone: '02-123-4567',
    address: '123 ถนนสุขุมวิท ท่าพระยา เขตปทุมวัน กรุงเทพฯ 10110',
    taxId: '0123456789012',
    commission: 20,
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '012-3-45678-9',
    bankAccountName: 'โรงแรมฮิลตัน จำกัด',
  })

  const handleSave = () => {
    console.log('Saving hotel data:', hotelData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset to original values
    setHotelData({
      name: 'โรงแรมฮิลตัน อยุธยา',
      nameEn: 'Hilton Bangkok',
      contactPerson: 'สมศรี มั่งมี',
      email: 'reservations@hilton.com',
      phone: '02-123-4567',
      address: '123 ถนนสุขุมวิท ท่าพระยา เขตปทุมวัน กรุงเทพฯ 10110',
      taxId: '0123456789012',
      commission: 20,
      bankName: 'ธนาคารกสิกรไทย',
      bankAccount: '012-3-45678-9',
      bankAccountName: 'โรงแรมฮิลตัน จำกัด',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ข้อมูลโรงแรม</h1>
          <p className="text-stone-500">Hotel Profile</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
          >
            <Edit className="w-5 h-5" />
            แก้ไขข้อมูล
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
            >
              <Save className="w-5 h-5" />
              บันทึก
            </button>
          </div>
        )}
      </div>

      {/* Hotel Info Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-800 to-stone-900 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl flex items-center justify-center text-2xl font-bold">
              ฮ
            </div>
            <div>
              <h2 className="text-xl font-bold">{hotelData.name}</h2>
              <p className="text-stone-300">{hotelData.nameEn}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลพื้นฐาน</h3>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อโรงแรม (ไทย)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={hotelData.name}
                    onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-stone-900">{hotelData.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อโรงแรม (อังกฤษ)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={hotelData.nameEn}
                    onChange={(e) => setHotelData({ ...hotelData, nameEn: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-stone-900">{hotelData.nameEn}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ที่อยู่</label>
                {isEditing ? (
                  <textarea
                    value={hotelData.address}
                    onChange={(e) => setHotelData({ ...hotelData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
                    <p className="text-stone-900">{hotelData.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลติดต่อ</h3>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ผู้ติดต่อ</label>
                {isEditing ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="text"
                      value={hotelData.contactPerson}
                      onChange={(e) => setHotelData({ ...hotelData, contactPerson: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{hotelData.contactPerson}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">อีเมล</label>
                {isEditing ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="email"
                      value={hotelData.email}
                      onChange={(e) => setHotelData({ ...hotelData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{hotelData.email}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">เบอร์โทรศัพท์</label>
                {isEditing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="tel"
                      value={hotelData.phone}
                      onChange={(e) => setHotelData({ ...hotelData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{hotelData.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tax & Business Info */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลภาษีและธุรกิจ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">เลขประจำตัวผู้เสียภาษี</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={hotelData.taxId}
                    onChange={(e) => setHotelData({ ...hotelData, taxId: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="font-mono text-stone-900">{hotelData.taxId}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">อัตราส่วนลด</label>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input
                      type="number"
                      value={hotelData.commission}
                      onChange={(e) => setHotelData({ ...hotelData, commission: Number(e.target.value) })}
                      className="w-20 px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  ) : (
                    <span className="text-lg font-bold text-amber-700">{hotelData.commission}</span>
                  )}
                  <span className="text-stone-600">%</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">ส่วนลดที่โรงแรมได้รับจากราคาปกติ</p>
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลบัญชีธนาคาร</h3>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ธนาคาร</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={hotelData.bankName}
                      onChange={(e) => setHotelData({ ...hotelData, bankName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  ) : (
                    <p className="text-stone-900">{hotelData.bankName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เลขที่บัญชี</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={hotelData.bankAccount}
                      onChange={(e) => setHotelData({ ...hotelData, bankAccount: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  ) : (
                    <p className="font-mono text-stone-900">{hotelData.bankAccount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อบัญชี</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={hotelData.bankAccountName}
                      onChange={(e) => setHotelData({ ...hotelData, bankAccountName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  ) : (
                    <p className="text-stone-900">{hotelData.bankAccountName}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelProfile
