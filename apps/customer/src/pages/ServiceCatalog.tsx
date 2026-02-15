import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Star, Clock, List, Sparkles, Hand, Flower2 } from 'lucide-react'
import { useServices } from '@bliss/supabase/hooks/useServices'
import { useTranslation } from '@bliss/i18n'

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
}

function ServiceCatalog() {
  const { t } = useTranslation(['services', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: services, isLoading, error } = useServices()

  const categories = [
    { id: 'all', name: t('services:catalog.all'), icon: List },
    { id: 'massage', name: t('services:catalog.massage'), icon: Sparkles },
    { id: 'nail', name: t('services:catalog.nail'), icon: Hand },
    { id: 'spa', name: t('services:catalog.spa'), icon: Flower2 },
  ]

  const sortOptions = [
    { id: 'popular', name: t('services:catalog.popular') },
    { id: 'price-low', name: t('services:catalog.priceLowToHigh') },
    { id: 'price-high', name: t('services:catalog.priceHighToLow') },
    { id: 'rating', name: t('services:catalog.topRated') },
  ]

  useEffect(() => {
    const category = searchParams.get('category')
    if (category) setSelectedCategory(category)
    const search = searchParams.get('search')
    if (search) setSearchQuery(search)
  }, [searchParams])

  // Transform services to match expected format
  const transformedServices = useMemo(() => {
    return services?.map(service => ({
      id: service.id,
      name: service.name_en || service.name_th,
      price: Number(service.base_price || 0),
      category: service.category,
      rating: 4.5, // Default rating since we don't have rating field yet
      reviews: 0, // Default reviews since we don't have reviews field yet
      duration: service.duration || 60,
      slug: service.slug,
      image: service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    })) || []
  }, [services])

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let filtered = transformedServices.filter(service => {
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })

    // Sort
    return [...filtered].sort((a, b) => {
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
  }, [transformedServices, selectedCategory, searchQuery, sortBy])

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-stone-900 mb-2 tracking-wide">{t('services:catalog.title')}</h1>
          <p className="text-stone-600 font-light">{t('services:catalog.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-8 border border-stone-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder={t('services:catalog.searchPlaceholder')}
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
            <p className="text-stone-600 mt-4">{t('common:loading.services')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">{t('common:errors.cannotLoadService')}</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            <div className="mb-4 text-stone-600 font-light">
              {t('services:catalog.resultsCount', { count: filteredServices.length })}
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
                    <span className="text-sm text-stone-400">({service.reviews} {t('services:catalog.reviews')})</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-stone-500 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {service.duration} {t('services:catalog.min')}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-amber-700">฿{service.price}</span>
                    <button className="bg-stone-900 text-white px-4 py-2 rounded-full font-medium hover:bg-amber-700 transition">
                      {t('services:catalog.book')}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-stone-400 mx-auto" />
            <p className="text-stone-500 mt-4 font-light">{t('services:catalog.noResults')}</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSearchParams({})
              }}
              className="mt-4 text-amber-700 hover:text-amber-800 font-medium"
            >
              {t('services:catalog.clearFilters')}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

export default ServiceCatalog
