import { Building2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHotelContext, REAL_HOTELS } from '../hooks/useHotelContext'

export const HotelSelector = () => {
  const { hotelId } = useHotelContext()

  const availableHotels = Object.values(REAL_HOTELS).filter(hotel => hotel.status === 'active')

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-bliss-200">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-bliss-700" />
        <h3 className="font-semibold text-bliss-900">เปลี่ยนโรงแรม</h3>
        <span className="text-xs bg-bliss-100 text-bliss-700 px-2 py-1 rounded">Demo</span>
      </div>

      <div className="space-y-2">
        {availableHotels.map((hotel) => {
          const isCurrentHotel = hotel.id === hotelId

          return (
            <Link
              key={hotel.id}
              to={`/hotel/${hotel.id}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition ${
                isCurrentHotel
                  ? 'bg-bliss-50 border-bliss-200 text-bliss-900'
                  : 'bg-white border-bliss-200 text-bliss-700 hover:bg-bliss-50 hover:border-bliss-300'
              }`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isCurrentHotel
                      ? 'bg-bliss-200 text-bliss-800'
                      : 'bg-bliss-200 text-bliss-700'
                  }`}>
                    {hotel.name_th.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{hotel.name_th}</p>
                    <p className="text-xs opacity-75">{hotel.name_en}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCurrentHotel ? (
                  <span className="text-xs font-medium px-2 py-1 bg-bliss-200 text-bliss-800 rounded">
                    ปัจจุบัน
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 opacity-50" />
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-bliss-200">
        <p className="text-xs text-bliss-500">
          💡 เปลี่ยน URL เป็น /hotel/&lt;hotel-id&gt; เพื่อเปลี่ยนโรงแรม
        </p>
      </div>
    </div>
  )
}