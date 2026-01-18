import { Link } from 'react-router-dom'
import { ClipboardList, Calendar, Clock } from 'lucide-react'

// Service image mapping
const serviceImages: Record<string, string> = {
  'Thai Massage (2 hours)': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
  'Oil Massage (2 hours)': 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80',
  'Gel Manicure': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80',
  'Luxury Spa Package': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
  'Gel Pedicure': 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?w=800&q=80',
}

function BookingHistory() {
  // Mock booking data
  const mockBookings = [
    {
      id: 'BK20260114001',
      serviceName: 'Thai Massage (2 hours)',
      date: '2026-01-20',
      time: '14:00',
      status: 'confirmed',
      price: 800,
    },
    {
      id: 'BK20260110002',
      serviceName: 'Gel Manicure',
      date: '2026-01-10',
      time: '10:30',
      status: 'completed',
      price: 450,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'completed':
        return 'Completed'
      case 'pending':
        return 'Pending'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">Booking History</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button className="px-6 py-2 bg-amber-700 text-white rounded-full font-medium">
            All
          </button>
          <button className="px-6 py-2 bg-stone-100 text-stone-700 rounded-full font-medium hover:bg-stone-200">
            Upcoming
          </button>
          <button className="px-6 py-2 bg-stone-100 text-stone-700 rounded-full font-medium hover:bg-stone-200">
            Completed
          </button>
          <button className="px-6 py-2 bg-stone-100 text-stone-700 rounded-full font-medium hover:bg-stone-200">
            Cancelled
          </button>
        </div>

        {/* Bookings List */}
        {mockBookings.length > 0 ? (
          <div className="space-y-4">
            {mockBookings.map((booking) => (
              <Link
                key={booking.id}
                to={`/bookings/${booking.id}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-6 block"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                    <img src={serviceImages[booking.serviceName] || serviceImages['Thai Massage (2 hours)']} alt={booking.serviceName} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-stone-900 mb-1">{booking.serviceName}</h3>
                    <div className="flex items-center gap-4 text-sm text-stone-600">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                    <p className="text-lg font-bold text-amber-700 mt-2">฿{booking.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-stone-400 mx-auto" />
            <p className="text-stone-500 mt-4 mb-4">No bookings yet</p>
            <Link to="/services" className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition">
              View Services
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHistory