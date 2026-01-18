import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Star, Clock, List, Sparkles, Hand, Flower2 } from 'lucide-react'

// Mock data - will be replaced with real Supabase data
const mockServices = [
  { id: 1, name: 'Thai Massage (2 hours)', price: 800, category: 'massage', rating: 4.8, reviews: 120, duration: 120, slug: 'thai-massage-2hr', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80' },
  { id: 2, name: 'Oil Massage (2 hours)', price: 1000, category: 'massage', rating: 4.9, reviews: 85, duration: 120, slug: 'oil-massage-2hr', image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80' },
  { id: 3, name: 'Foot Massage (1 hour)', price: 400, category: 'massage', rating: 4.7, reviews: 200, duration: 60, slug: 'foot-massage-1hr', image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&q=80' },
  { id: 4, name: 'Herbal Compress (2 hours)', price: 1200, category: 'massage', rating: 4.8, reviews: 45, duration: 120, slug: 'herbal-compress-2hr', image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&q=80' },
  { id: 5, name: 'Gel Manicure', price: 450, category: 'nail', rating: 4.7, reviews: 90, duration: 60, slug: 'gel-manicure', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80' },
  { id: 6, name: 'Gel Pedicure', price: 550, category: 'nail', rating: 4.8, reviews: 75, duration: 75, slug: 'gel-pedicure', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?w=800&q=80' },
  { id: 7, name: 'Classic Manicure', price: 300, category: 'nail', rating: 4.6, reviews: 110, duration: 45, slug: 'classic-manicure', image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80' },
  { id: 8, name: 'Nail Art Design', price: 600, category: 'nail', rating: 4.9, reviews: 35, duration: 90, slug: 'nail-art', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80' },
  { id: 9, name: 'Luxury Spa Package', price: 2500, category: 'spa', rating: 5.0, reviews: 25, duration: 150, slug: 'luxury-spa-package', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80' },
  { id: 10, name: 'Facial Treatment', price: 1200, category: 'spa', rating: 4.8, reviews: 60, duration: 90, slug: 'facial-treatment', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80' },
  { id: 11, name: 'Body Scrub', price: 800, category: 'spa', rating: 4.7, reviews: 40, duration: 60, slug: 'body-scrub', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80' },
  { id: 12, name: 'Aromatherapy Massage', price: 1500, category: 'massage', rating: 4.9, reviews: 55, duration: 120, slug: 'aromatherapy-massage', image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80' },
]

const categories = [
  { id: 'all', name: 'All', icon: List },
  { id: 'massage', name: 'Massage', icon: Sparkles },
  { id: 'nail', name: 'Nail Care', icon: Hand },
  { id: 'spa', name: 'Spa', icon: Flower2 },
]

const sortOptions = [
  { id: 'popular', name: 'Popular' },
  { id: 'price-low', name: 'Price: Low to High' },
  { id: 'price-high', name: 'Price: High to Low' },
  { id: 'rating', name: 'Top Rated' },
]

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
}

function ServiceCatalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const category = searchParams.get('category')
    if (category) setSelectedCategory(category)
  }, [searchParams])

  // Filter and sort services
  let filteredServices = mockServices.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Sort
  filteredServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'rating':
        return b.rating - a.rating
      default:
        return b.reviews - a.reviews // popular
    }
  })

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-stone-900 mb-2 tracking-wide">All Services</h1>
          <p className="text-stone-600 font-light">Discover and select your desired service</p>
        </div>

        {/* Search */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-8 border border-stone-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition bg-white"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    if (category.id === 'all') {
                      setSearchParams({})
                    } else {
                      setSearchParams({ category: category.id })
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition ${
                    selectedCategory === category.id
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <category.icon className="w-4 h-4" />
                  {category.name}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-amber-500 bg-white text-stone-700"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 text-stone-600 font-light">
          {filteredServices.length} services found
        </div>

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.slug}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden group border border-stone-100"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-medium text-lg text-stone-900 mb-2">{service.name}</h3>

                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-stone-700">{service.rating}</span>
                    <span className="text-sm text-stone-400">({service.reviews} reviews)</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-stone-500 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {service.duration} min</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-amber-700">฿{service.price}</span>
                    <button className="bg-stone-900 text-white px-4 py-2 rounded-full font-medium hover:bg-amber-700 transition">
                      Book
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-stone-400 mx-auto" />
            <p className="text-stone-500 mt-4 font-light">No services found</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSearchParams({})
              }}
              className="mt-4 text-amber-700 hover:text-amber-800 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceCatalog
