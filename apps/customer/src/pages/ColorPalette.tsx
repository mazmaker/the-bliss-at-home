import { Link } from 'react-router-dom'
import { ChevronLeft, Check, Copy } from 'lucide-react'
import { useState } from 'react'

function ColorPalette() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (color: string, name: string) => {
    navigator.clipboard.writeText(color)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  const colors = [
    // Primary Amber Colors
    { name: 'bliss-100', hex: '#fffbeb', class: 'bg-bliss-100', text: 'text-bliss-800' },
    { name: 'bliss-200', hex: '#fef3c7', class: 'bg-bliss-200', text: 'text-bliss-800' },
    { name: 'bliss-300', hex: '#fde68a', class: 'bg-bliss-300', text: 'text-bliss-800' },
    { name: 'bliss-400', hex: '#fcd34d', class: 'bg-bliss-400', text: 'text-bliss-800' },
    { name: 'bliss-500', hex: '#fbbf24', class: 'bg-bliss-500', text: 'text-bliss-800' },
    { name: 'bliss-600', hex: '#f59e0b', class: 'bg-bliss-600', text: 'text-white' },
    { name: 'bliss-600', hex: '#d97706', class: 'bg-bliss-600', text: 'text-white' },
    { name: 'bliss-600', hex: '#b45309', class: 'bg-bliss-600', text: 'text-white' },
    { name: 'bliss-700', hex: '#92400e', class: 'bg-bliss-700', text: 'text-white' },
    { name: 'bliss-800', hex: '#78350f', class: 'bg-bliss-800', text: 'text-white' },
  ]

  const stoneColors = [
    { name: 'bliss-100', hex: '#fafaf9', class: 'bg-bliss-100', text: 'text-bliss-900' },
    { name: 'bliss-100', hex: '#f5f5f4', class: 'bg-bliss-100', text: 'text-bliss-900' },
    { name: 'bliss-200', hex: '#e7e5e4', class: 'bg-bliss-200', text: 'text-bliss-900' },
    { name: 'bliss-300', hex: '#d6d3d1', class: 'bg-bliss-300', text: 'text-bliss-900' },
    { name: 'bliss-400', hex: '#a8a29e', class: 'bg-bliss-400', text: 'text-white' },
    { name: 'bliss-500', hex: '#78716c', class: 'bg-bliss-500', text: 'text-white' },
    { name: 'bliss-700', hex: '#57534e', class: 'bg-bliss-700', text: 'text-white' },
    { name: 'bliss-700', hex: '#44403c', class: 'bg-bliss-700', text: 'text-white' },
    { name: 'bliss-900', hex: '#292524', class: 'bg-bliss-900', text: 'text-white' },
    { name: 'bliss-900', hex: '#1c1917', class: 'bg-bliss-900', text: 'text-white' },
  ]

  const gradients = [
    { name: 'Primary Button', class: 'bg-bliss-600' },
    { name: 'Hero Background', class: 'bg-bliss-100' },
    { name: 'Service Card', class: 'bg-bliss-100' },
    { name: 'Profile Header', class: 'bg-bliss-600' },
    { name: 'Promotion Gold', class: 'bg-gradient-to-r from-bliss-600 via-bliss-500 to-bliss-600' },
    { name: 'Dark Premium', class: 'bg-gradient-to-r from-bliss-900 via-bliss-700 to-bliss-900' },
    { name: 'CTA Section', class: 'bg-gradient-to-r from-bliss-900 via-bliss-700 to-bliss-900' },
  ]

  const uiExamples = [
    {
      name: 'Buttons',
      items: [
        { name: 'Primary', class: 'bg-bliss-600 text-white px-6 py-3 rounded-xl font-medium' },
        { name: 'Secondary', class: 'bg-bliss-100 text-bliss-700 px-6 py-3 rounded-xl font-medium hover:bg-bliss-200' },
        { name: 'Outline', class: 'border-2 border-bliss-600 text-bliss-600 px-6 py-3 rounded-xl font-medium' },
        { name: 'Ghost', class: 'text-bliss-600 font-medium hover:bg-bliss-100 px-4 py-2' },
      ]
    },
    {
      name: 'Cards',
      items: [
        { name: 'Default', class: 'bg-white rounded-2xl shadow-lg p-6 border border-bliss-100' },
        { name: 'Selected', class: 'bg-white rounded-2xl shadow-lg p-6 border-2 border-bliss-600' },
        { name: 'Hover State', class: 'bg-white rounded-2xl shadow-xl p-6 border border-bliss-100 hover:border-bliss-400' },
      ]
    },
    {
      name: 'Badges & Status',
      items: [
        { name: 'Confirmed', class: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium' },
        { name: 'Completed', class: 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium' },
        { name: 'Pending', class: 'bg-yellow-100 text-bliss-600 px-3 py-1 rounded-full text-sm font-medium' },
        { name: 'Default Tag', class: 'bg-bliss-600 text-white px-2 py-1 rounded-full text-xs' },
      ]
    },
    {
      name: 'Inputs',
      items: [
        { name: 'Default', class: 'w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent' },
        { name: 'With Focus', class: 'w-full px-4 py-3 border-2 border-bliss-600 rounded-xl' },
      ]
    },
  ]

  const typography = [
    { name: 'Heading 1', class: 'text-5xl font-light text-bliss-900', text: 'Luxury Spa at Home' },
    { name: 'Heading 2', class: 'text-3xl font-light text-bliss-900', text: 'Premium Services' },
    { name: 'Heading 3', class: 'text-2xl font-light text-bliss-900', text: 'Book Now' },
    { name: 'Body Large', class: 'text-lg text-bliss-700 font-light', text: 'Professional massage & spa services delivered to your door' },
    { name: 'Body', class: 'text-bliss-700', text: 'Experience luxury wellness at home with our curated professionals' },
    { name: 'Caption', class: 'text-sm text-bliss-500', text: '120 reviews • 2 hours' },
    { name: 'Price', class: 'text-2xl font-semibold text-bliss-600', text: '฿1,200' },
  ]

  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-bliss-700 hover:text-bliss-600 mb-6 font-medium transition">
            <ChevronLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-light text-bliss-900 mb-2">Design System</h1>
          <p className="text-bliss-700 font-light">Color palette, typography, and UI components for The Bliss Massage at Home</p>
          <p className="text-bliss-600 font-medium mt-2">ระบบการออกแบบ | สีและตัวอย่างส่วนประกอบ UI</p>
        </div>

        {/* Color Palettes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Amber Colors */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-medium text-bliss-900 mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-bliss-600 rounded-full"></span>
              Amber (Primary)
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {colors.map((color) => (
                <div
                  key={color.name}
                  className="group cursor-pointer"
                  onClick={() => copyToClipboard(color.hex, color.name)}
                >
                  <div className={`aspect-square ${color.class} rounded-xl shadow-md group-hover:scale-105 transition relative flex items-center justify-center`}>
                    {copied === color.name && (
                      <Check className="w-6 h-6 text-white drop-shadow-md" />
                    )}
                  </div>
                  <p className="text-xs text-bliss-700 mt-2 text-center font-medium">{color.name}</p>
                  <p className="text-xs text-bliss-400 text-center">{color.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stone Colors */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-medium text-bliss-900 mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-bliss-700 rounded-full"></span>
              Stone (Neutral)
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {stoneColors.map((color) => (
                <div
                  key={color.name}
                  className="group cursor-pointer"
                  onClick={() => copyToClipboard(color.hex, color.name)}
                >
                  <div className={`aspect-square ${color.class} rounded-xl shadow-md group-hover:scale-105 transition relative flex items-center justify-center border border-bliss-200`}>
                    {copied === color.name && (
                      <Check className="w-6 h-6 text-white drop-shadow-md" />
                    )}
                  </div>
                  <p className="text-xs text-bliss-700 mt-2 text-center font-medium">{color.name}</p>
                  <p className="text-xs text-bliss-400 text-center">{color.hex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gradients */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-medium text-bliss-900 mb-6">Gradients</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {gradients.map((gradient) => (
              <div key={gradient.name} className="group">
                <div className={`h-24 ${gradient.class} rounded-xl shadow-md group-hover:scale-105 transition`}></div>
                <p className="text-xs text-bliss-700 mt-2 text-center font-medium">{gradient.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* UI Components */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-medium text-bliss-900 mb-6">UI Components</h2>
          <div className="space-y-8">
            {uiExamples.map((section) => (
              <div key={section.name}>
                <h3 className="text-lg font-medium text-bliss-700 mb-4">{section.name}</h3>
                <div className="flex flex-wrap gap-4">
                  {section.items.map((item) => (
                    <div key={item.name} className="flex flex-col items-center gap-2">
                      <div className={item.class}>
                        {section.name === 'Buttons' && item.name}
                        {section.name === 'Cards' && (
                          <div className="w-32 h-20 bg-bliss-100 rounded-lg"></div>
                        )}
                        {section.name === 'Badges & Status' && item.name}
                        {section.name === 'Inputs' && (
                          <input
                            type="text"
                            placeholder="Enter text..."
                            className={item.class}
                          />
                        )}
                      </div>
                      <span className="text-xs text-bliss-500">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-medium text-bliss-900 mb-2">Typography</h2>
          <p className="text-bliss-600 text-sm mb-6">แบบอักษร Anantason | Font: Anantason</p>
          <div className="space-y-6">
            {typography.map((type) => (
              <div key={type.name} className="flex items-center gap-6 pb-4 border-b border-bliss-100 last:border-0">
                <span className="text-sm text-bliss-400 w-32 flex-shrink-0">{type.name}</span>
                <div className="flex-1">
                  <span className={type.class}>{type.text}</span>
                  {type.name === 'Heading 1' && (
                    <p className={type.class}>สปาหรูที่บ้านคุณ</p>
                  )}
                  {type.name === 'Heading 2' && (
                    <p className={type.class}>บริการพรีเมียม</p>
                  )}
                  {type.name === 'Heading 3' && (
                    <p className={type.class}>จองเลย</p>
                  )}
                  {type.name === 'Body Large' && (
                    <p className={type.class}>บริการนวดและสปาแบบมืออาชีพส่งตรงถึงที่บ้านคุณ</p>
                  )}
                  {type.name === 'Body' && (
                    <p className={type.class}>สัมผัสประสบการณ์ความผ่อนคลายแบบพรีเมียมที่บ้าน</p>
                  )}
                  {type.name === 'Caption' && (
                    <p className={type.class}>120 รีวิว • 2 ชั่วโมง</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Font Showcase */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-medium text-bliss-900 mb-2">Font Weights</h2>
          <p className="text-bliss-600 text-sm mb-6">น้ำหนักฟอนต์ | Font Weight Examples</p>
          <div className="space-y-4">
            <div className="pb-4 border-b border-bliss-100">
              <span className="text-sm text-bliss-400 w-32 inline-block">Light (300)</span>
              <span className="font-light text-2xl text-bliss-900">The Bliss Massage at Home</span>
              <span className="font-light text-2xl text-bliss-900 ml-4">เดอะ บลิส มาสสาจ แอท โฮม</span>
            </div>
            <div className="pb-4 border-b border-bliss-100">
              <span className="text-sm text-bliss-400 w-32 inline-block">Regular (400)</span>
              <span className="font-normal text-2xl text-bliss-900">The Bliss Massage at Home</span>
              <span className="font-normal text-2xl text-bliss-900 ml-4">เดอะ บลิส มาสสาจ แอท โฮม</span>
            </div>
            <div className="pb-4 border-b border-bliss-100">
              <span className="text-sm text-bliss-400 w-32 inline-block">Medium (500)</span>
              <span className="font-medium text-2xl text-bliss-900">The Bliss Massage at Home</span>
              <span className="font-medium text-2xl text-bliss-900 ml-4">เดอะ บลิส มาสสาจ แอท โฮม</span>
            </div>
            <div className="pb-4 border-b border-bliss-100">
              <span className="text-sm text-bliss-400 w-32 inline-block">Semi-Bold (600)</span>
              <span className="font-semibold text-2xl text-bliss-900">The Bliss Massage at Home</span>
              <span className="font-semibold text-2xl text-bliss-900 ml-4">เดอะ บลิส มาสสาจ แอท โฮม</span>
            </div>
            <div>
              <span className="text-sm text-bliss-400 w-32 inline-block">Bold (700)</span>
              <span className="font-bold text-2xl text-bliss-900">The Bliss Massage at Home</span>
              <span className="font-bold text-2xl text-bliss-900 ml-4">เดอะ บลิส มาสสาจ แอท โฮม</span>
            </div>
          </div>
        </div>

        {/* Usage Guidelines */}
        <div className="mt-12 bg-bliss-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-light mb-2">Usage Guidelines</h2>
          <p className="text-white/80 text-sm mb-4">แนวทางการใช้งาน</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Primary Actions | การกระทำหลัก</h3>
              <p className="text-white/80 text-sm">Use bliss-600/800 gradient for main CTAs like "Book Now" buttons</p>
              <p className="text-white/80 text-sm">ใช้สีแอมเบอร์ 700/800 สำหรับปุ่มหลักเช่น "จองเลย"</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Secondary Actions | การกระทำรอง</h3>
              <p className="text-white/80 text-sm">Use bliss-100/200 for secondary buttons and backgrounds</p>
              <p className="text-white/80 text-sm">ใช้สีโสน 100/200 สำหรับปุ่มรองและพื้นหลัง</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Text Hierarchy | ลำดับข้อความ</h3>
              <p className="text-white/80 text-sm">Stone-900 for headings, bliss-700 for body, bliss-500 for captions</p>
              <p className="text-white/80 text-sm">สีโสน 900 สำหรับหัวข้อ, โสน 700 สำหรับเนื้อหา, โสน 500 สำหรับคำบรรยาย</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Accents | จุดเด่น</h3>
              <p className="text-white/80 text-sm">Amber-500/600 for icons, stars, and highlights</p>
              <p className="text-white/80 text-sm">สีแอมเบอร์ 500/600 สำหรับไอคอน, ดาว และไฮไลท์</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-bliss-500 text-sm">
          <p>The Bliss Massage at Home Design System</p>
          <p className="mt-1">ระบบการออกแบบของ เดอะ บลิส มาสสาจ แอท โฮม</p>
          <p className="mt-2">Click any color to copy its hex value | คลิกที่สีเพื่อคัดลอกค่า hex</p>
        </div>
      </div>
    </div>
  )
}

export default ColorPalette
