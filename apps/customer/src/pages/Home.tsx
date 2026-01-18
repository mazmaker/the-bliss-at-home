import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, ChevronRight, Sparkles, Home, Shield, Gem, ChevronLeft, Hand, Flower2, Waves } from 'lucide-react'

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    { id: 'massage', name: 'Massage', icon: Sparkles, color: 'champagne', services: 15 },
    { id: 'nail', name: 'Nail Care', icon: Hand, color: 'rose-gold', services: 12 },
    { id: 'spa', name: 'Spa', icon: Flower2, color: 'sage', services: 8 },
  ]

  const promotions = [
    {
      id: 1,
      title: 'First Booking Discount',
      subtitle: '20% OFF',
      description: 'Get 20% off on your first massage booking',
      bgColor: 'from-amber-600 via-yellow-600 to-amber-700',
      icon: 'gift',
    },
    {
      id: 2,
      title: 'Spa Package',
      subtitle: 'Bundle & Save',
      description: 'Book 3 spa sessions, get 1 free',
      bgColor: 'from-stone-700 via-stone-600 to-stone-800',
      icon: 'package',
    },
  ]

  const popularServices = [
    { id: 1, name: 'Thai Massage (2 hours)', price: 800, category: 'massage', rating: 4.8, slug: 'thai-massage-2hr', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80' },
    { id: 2, name: 'Oil Massage (2 hours)', price: 1000, category: 'massage', rating: 4.9, slug: 'oil-massage-2hr', image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80' },
    { id: 3, name: 'Gel Manicure', price: 450, category: 'nail', rating: 4.7, slug: 'gel-manicure', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80' },
    { id: 4, name: 'Luxury Spa Package', price: 2500, category: 'spa', rating: 5.0, slug: 'luxury-spa-package', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="text-center mb-12 max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-stone-900 mb-6">
            Luxury Spa
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 font-normal">
              At Your Home
            </span>
          </h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto font-light leading-relaxed">
            Premium massage, spa & nail services
            <br />
            Delivered by curated professionals
          </p>
        </div>

        {/* Quick Search */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-2 flex items-center gap-2 border border-stone-100">
            <div className="flex-1 flex items-center gap-2 px-4 py-3">
              <Search className="w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search services..."
                className="flex-1 outline-none text-stone-700 placeholder-stone-400 bg-transparent"
              />
            </div>
            <Link to="/services" className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Promotions Carousel */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-4 overflow-x-auto pb-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`min-w-[300px] bg-gradient-to-r ${promo.bgColor} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="relative text-sm font-medium tracking-wider opacity-80">{promo.subtitle}</span>
              <h3 className="relative text-2xl font-light mt-1">{promo.title}</h3>
              <p className="relative text-sm opacity-80 mt-2 font-light">{promo.description}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-stone-900 mb-8 tracking-wide">SERVICES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <Link
                key={category.id}
                to={`/services?category=${category.id}`}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 text-left block border border-stone-100 group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-stone-100 rounded-xl flex items-center justify-center mb-4 group-hover:from-amber-100 group-hover:to-amber-50 transition">
                  <IconComponent className="w-7 h-7 text-amber-700" />
                </div>
                <h4 className="text-xl font-medium text-stone-900 mb-1">{category.name}</h4>
                <p className="text-stone-500 text-sm font-light">{category.services} services</p>
              </Link>
            )
          })}
        </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-light text-stone-900 tracking-wide">POPULAR SERVICES</h3>
            <Link to="/services" className="text-amber-700 hover:text-amber-800 font-medium text-sm flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularServices.map((service) => {
            const category = categories.find(c => c.id === service.category)
            const IconComponent = category?.icon || Sparkles
            return (
              <Link
                key={service.id}
                to={`/services/${service.slug}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden group block border border-stone-100"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-stone-900 mb-2">{service.name}</h4>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm text-stone-600">{service.rating}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-amber-700">฿{service.price}</span>
                    <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-amber-100 hover:text-amber-800 transition">
                      Book
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-stone-900 mb-8 text-center tracking-wide">WHY CHOOSE US</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">Experts</h4>
            <p className="text-stone-600 text-sm font-light">Professional & trained team</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-stone-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">At Your Door</h4>
            <p className="text-stone-600 text-sm font-light">Convenient home service</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gem className="w-8 h-8 text-amber-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">Premium Quality</h4>
            <p className="text-stone-600 text-sm font-light">Luxury products & service</p>
          </div>
        </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-stone-800 via-stone-700 to-stone-900 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
          <h3 className="text-3xl font-light mb-4 tracking-wide">Ready to Indulge?</h3>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto font-light">
            Book your massage, spa or nail service today
            <br />
            Experience luxury at your home
          </p>
          <Link to="/services" className="inline-block bg-white text-stone-800 px-8 py-4 rounded-full font-medium text-lg hover:shadow-2xl transition transform hover:scale-105">
            Book Now
          </Link>
        </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
