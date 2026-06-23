import { Star, Search, Sparkles, Home, Gem, Bell, User, ChevronRight, Tag, ClipboardList, Briefcase, Check, Flower2 } from 'lucide-react'
import { useState } from 'react'

/* ─── Color tokens (actual tailwind.config values) ─── */
const C = {
  50:  '#f6f3f0',
  100: '#f2ede9',
  200: '#e3dbd4',
  300: '#d0c4b8',
  400: '#bfb5a1',
  500: '#a09484',
  600: '#837858',
  700: '#775642',
  800: '#4a3728',
  900: '#1a1a1a',
}

function Chip({ color, shade, label }: { color: string; shade: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const dark = parseInt(shade) >= 600
  return (
    <button
      className="text-left group"
      onClick={() => { navigator.clipboard.writeText(color); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
    >
      <div className="h-14 rounded-xl mb-2 flex items-center justify-center group-hover:scale-105 transition shadow-sm border border-black/5" style={{ background: color }}>
        {copied && <Check className={`w-4 h-4 ${dark ? 'text-white' : 'text-bliss-700'}`} />}
      </div>
      <p className="text-[11px] font-semibold text-bliss-800">bliss-{shade}</p>
      <p className="text-[10px] text-bliss-400">{color}</p>
      <p className="text-[10px] text-bliss-400 leading-tight">{label}</p>
    </button>
  )
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-bliss-200 shadow-sm p-6 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-bliss-400 uppercase tracking-widest mb-5">{title}</h3>}
      {children}
    </div>
  )
}

export default function DesignGuide() {
  return (
    <div className="min-h-screen" style={{ background: C[100] }}>

      {/* ── COVER ── */}
      <div className="relative overflow-hidden" style={{ background: C[800] }}>
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: 200 + i * 120, height: 200 + i * 120, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative max-w-4xl mx-auto px-8 py-16 text-center">
          <img src="/logo.jpg" alt="The Bliss" className="h-24 w-auto mx-auto mb-6 rounded-2xl shadow-xl" />
          <h1 className="text-4xl font-light tracking-widest text-white mb-2">THE BLISS MASSAGE AT HOME</h1>
          <p className="text-sm font-light tracking-widest mb-6" style={{ color: C[300] }}>UI / UX DESIGN GUIDE · 2026</p>
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: C[400] }}>
            <span>Customer App</span>
            <span style={{ color: C[600] }}>●</span>
            <span>Warm Earth Collection</span>
            <span style={{ color: C[600] }}>●</span>
            <span>feat/ui-redesign</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── 1. COLOR PALETTE ── */}
        <Card title="1 · Color Palette — Bliss">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-6">
            {Object.entries(C).map(([shade, hex]) => {
              const labels: Record<string, string> = {
                '50': 'Card sub-bg', '100': 'Page bg', '200': 'Border',
                '300': 'Input border', '400': 'Placeholder', '500': 'Secondary',
                '600': 'Primary', '700': 'Hover', '800': 'CTA dark', '900': 'Headline'
              }
              return <Chip key={shade} shade={shade} color={hex} label={labels[shade] ?? ''} />
            })}
          </div>
          {/* Color role strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {[
              { role: 'Page background', shade: '100', text: C[700] },
              { role: 'Card surface', c: '#fff', text: C[700] },
              { role: 'Primary action', shade: '600', text: '#fff' },
              { role: 'Dark CTA section', shade: '800', text: '#fff' },
            ].map(r => (
              <div key={r.role} className="rounded-xl p-3 border border-black/5"
                style={{ background: r.c ?? C[r.shade as keyof typeof C], color: r.text }}>
                <div className="text-[10px] opacity-70 mb-0.5">{r.role}</div>
                <div className="text-xs font-semibold">{r.c ?? C[r.shade as keyof typeof C]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 2. TYPOGRAPHY ── */}
        <Card title="2 · Typography">
          <div className="space-y-5">
            {[
              { role: 'Hero H1 · font-light text-5xl', node: <h1 className="text-5xl font-light" style={{ color: C[900] }}>สปาหรู<span style={{ backgroundImage: `linear-gradient(to right,${C[600]},${C[500]},${C[700]})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ที่บ้าน</span></h1> },
              { role: 'Section title · font-light text-2xl tracking-wide', node: <h2 className="text-2xl font-light tracking-wide" style={{ color: C[900] }}>บริการยอดนิยม</h2> },
              { role: 'Card title · font-medium', node: <p className="font-medium" style={{ color: C[900] }}>นวดแผนไทยโบราณ</p> },
              { role: 'Body · font-light text-bliss-700', node: <p className="font-light text-sm leading-relaxed" style={{ color: C[700] }}>สัมผัสประสบการณ์ความผ่อนคลายระดับโรงแรม 5 ดาว ด้วยทีมนักนวดมืออาชีพที่บ้านของคุณ</p> },
              { role: 'Caption · text-sm text-bliss-500', node: <p className="text-sm" style={{ color: C[500] }}>120 รีวิว · 2 ชั่วโมง · เริ่มต้น ฿800</p> },
              { role: 'Price · font-semibold text-bliss-600', node: <p className="text-2xl font-semibold" style={{ color: C[600] }}>฿1,200</p> },
            ].map(t => (
              <div key={t.role} className="flex gap-4 items-start pb-4 border-b last:border-0" style={{ borderColor: C[100] }}>
                <span className="text-[10px] w-44 flex-shrink-0 pt-1" style={{ color: C[400] }}>{t.role}</span>
                <div className="flex-1">{t.node}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 3. HEADER ── */}
        <Card title="3 · Navigation Header">
          <div className="rounded-xl overflow-hidden border border-bliss-200 shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.95)', borderBottom: `1px solid ${C[200]}` }}>
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="logo" className="w-10 h-10 object-contain rounded-lg" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C[900] }}>The Bliss Massage at Home</p>
                  <p className="text-[10px] font-light" style={{ color: C[500] }}>Professional Home Spa Service</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                {[
                  { icon: Home, label: 'หน้าแรก', active: true },
                  { icon: Briefcase, label: 'บริการ' },
                  { icon: Tag, label: 'โปรโมชัน' },
                  { icon: ClipboardList, label: 'การจอง' },
                ].map(n => (
                  <div key={n.label} className="hidden sm:flex items-center gap-1 text-xs font-medium"
                    style={{ color: n.active ? C[600] : C[700] }}>
                    <n.icon className="w-3.5 h-3.5" />{n.label}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" style={{ color: C[600] }} />
                  <User className="w-4 h-4" style={{ color: C[700] }} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: C[400] }}>Sticky · backdrop-blur · bg-white/95 · border-bliss-200</p>
        </Card>

        {/* ── 4. HERO SECTION ── */}
        <Card title="4 · Hero Section">
          <div className="rounded-2xl px-6 py-10 text-center" style={{ background: C[100] }}>
            <h1 className="text-4xl font-light mb-3" style={{ color: C[900] }}>
              ผ่อนคลายอย่างสมบูรณ์แบบ<br />
              <span style={{ backgroundImage: `linear-gradient(to right,${C[600]},${C[500]},${C[700]})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ที่บ้านคุณ
              </span>
            </h1>
            <p className="text-sm font-light mb-6" style={{ color: C[700] }}>บริการนวดและสปาโดยผู้เชี่ยวชาญ<br />ส่งตรงถึงที่บ้านคุณ</p>
            <div className="flex items-center gap-2 rounded-2xl shadow-xl px-4 py-2 max-w-sm mx-auto border"
              style={{ background: 'rgba(255,255,255,0.85)', borderColor: C[100] }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: C[400] }} />
              <span className="flex-1 text-sm text-left" style={{ color: C[400] }}>ค้นหาบริการ...</span>
              <button className="text-xs text-white px-4 py-2 rounded-xl font-medium" style={{ background: C[600] }}>ค้นหา</button>
            </div>
          </div>
        </Card>

        {/* ── 5. SERVICE CARD ── */}
        <Card title="5 · Service Cards">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { name: 'นวดแผนไทย', cat: 'นวดไทย', price: '฿800', rating: '4.9', reviews: '84' },
              { name: 'อโรมาเทอราพี', cat: 'สปา', price: '฿1,200', rating: '4.8', reviews: '62' },
              { name: 'นวดหน้า', cat: 'สปา', price: '฿600', rating: '4.7', reviews: '41' },
            ].map(s => (
              <div key={s.name} className="bg-white rounded-2xl shadow-sm overflow-hidden border" style={{ borderColor: C[100] }}>
                <div className="h-28 flex items-center justify-center text-2xl" style={{ background: C[200] }}>💆</div>
                <div className="p-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: C[100], color: C[600] }}>{s.cat}</span>
                  <p className="font-medium text-sm mt-1.5 mb-0.5" style={{ color: C[900] }}>{s.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-current" style={{ color: C[600] }} />
                    <span className="text-xs font-medium" style={{ color: C[700] }}>{s.rating}</span>
                    <span className="text-xs" style={{ color: C[400] }}>({s.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: C[600] }}>{s.price}</span>
                    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: C[100], color: C[700] }}>จอง</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: C[400] }}>bg-white · rounded-2xl · shadow-lg · border-bliss-100</p>
        </Card>

        {/* ── 6. BUTTONS ── */}
        <Card title="6 · Buttons & Actions">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <button className="px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ background: C[600] }}>Primary · จองเลย</button>
              <button className="px-6 py-3 rounded-xl text-sm font-medium" style={{ background: C[100], color: C[700] }}>Secondary · ดูบริการ</button>
              <button className="px-6 py-3 rounded-xl text-sm font-medium border-2" style={{ borderColor: C[600], color: C[600] }}>Outline</button>
              <button className="px-6 py-3 rounded-xl text-sm font-medium" style={{ color: C[600] }}>Ghost · ยกเลิก</button>
            </div>
            {/* CTA dark strip */}
            <div className="rounded-2xl p-6 text-center" style={{ background: C[800] }}>
              <p className="text-xl font-light text-white mb-4">พร้อมให้บริการทุกวัน</p>
              <button className="px-8 py-3 rounded-full font-medium text-sm" style={{ background: C[50], color: C[900] }}>
                จองบริการเลยตอนนี้ →
              </button>
            </div>
            <p className="text-xs" style={{ color: C[400] }}>CTA section: bg-bliss-800 · button: bg-bliss-50 text-bliss-900 rounded-full</p>
          </div>
        </Card>

        {/* ── 7. FEATURES + EMERGENCY BANNER ── */}
        <Card title="7 · Features & Emergency Banner">
          {/* Why choose us */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: Sparkles, label: 'ผู้เชี่ยวชาญ', desc: 'นักนวดมืออาชีพ' },
              { icon: Home, label: 'ถึงบ้านคุณ', desc: 'บริการถึงที่' },
              { icon: Gem, label: 'พรีเมียม', desc: 'มาตรฐานสูงสุด' },
            ].map(f => (
              <div key={f.label} className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: C[100] }}>
                  <f.icon className="w-6 h-6" style={{ color: C[600] }} />
                </div>
                <p className="text-xs font-medium mb-0.5" style={{ color: C[900] }}>{f.label}</p>
                <p className="text-xs" style={{ color: C[500] }}>{f.desc}</p>
              </div>
            ))}
          </div>
          {/* Emergency Banner */}
          <div className="rounded-2xl p-4 text-white text-sm" style={{ background: C[600] }}>
            <p className="font-semibold">จองด่วนฉุกเฉิน</p>
            <p className="text-xs opacity-80 mt-0.5">ไม่ทันจองล่วงหน้า 3 ชั่วโมง? เรามีทีมพิเศษคอยช่วยเหลือสำหรับสมาชิก</p>
          </div>
          <p className="text-xs mt-2" style={{ color: C[400] }}>Feature icons: w-16 h-16 bg-bliss-100 rounded-2xl · Emergency: bg-bliss-600 (#837858)</p>
        </Card>

        {/* ── 8. BOOKING WIZARD ── */}
        <Card title="8 · Booking Wizard — Step Indicator">
          {[
            [1, 2, 3, 4],
            [1, 2, 3, 4],
          ].slice(0, 1).map((_, row) => (
            <div key={row} className="rounded-2xl p-5 border" style={{ background: C[100], borderColor: C[200] }}>
              <div className="flex items-start mb-4">
                {['บริการ', 'วันเวลา', 'ข้อมูล', 'ชำระ'].map((label, i) => (
                  <div key={label} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm text-white" style={{ background: i < 2 ? C[600] : C[200], color: i < 2 ? '#fff' : C[500] }}>
                        {i < 1 ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className="text-xs mt-1.5 whitespace-nowrap font-medium" style={{ color: i < 2 ? C[700] : C[400] }}>{label}</span>
                    </div>
                    {i < 3 && <div className="h-0.5 flex-1 self-start mt-[18px] mx-1" style={{ background: i < 1 ? C[600] : C[200] }} />}
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: C[400] }}>Step active: bg-bliss-600 · Done: bg-bliss-600 + checkmark · Pending: bg-bliss-200 · Connector: h-0.5 flex-1 self-start mt-[18px]</p>
            </div>
          ))}
        </Card>

        {/* ── 9. FORM INPUTS + BADGES ── */}
        <Card title="9 · Form Inputs & Status Badges">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C[700] }}>อีเมล</label>
              <input readOnly placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ background: C[50], borderColor: C[300], color: C[700] }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C[700] }}>เบอร์โทร (focused)</label>
              <input readOnly placeholder="08X-XXX-XXXX" className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ background: C[50], borderColor: C[600] }} />
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: C[400] }}>Default: border-bliss-300 bg-bliss-50 · Focus: ring-2 ring-bliss-600 border-transparent</p>

          <div className="flex flex-wrap gap-2">
            {[
              ['ยืนยันแล้ว', 'bg-blue-100 text-blue-700'],
              ['กำลังให้บริการ', 'bg-purple-100 text-purple-700'],
              ['เสร็จสิ้น', 'bg-green-100 text-green-700'],
              ['รอการยืนยัน', 'bg-yellow-100 text-yellow-700'],
              ['ยกเลิก', 'bg-red-100 text-red-600'],
            ].map(([label, cls]) => (
              <span key={label} className={`px-3 py-1 rounded-full text-sm font-medium ${cls}`}>{label}</span>
            ))}
          </div>
        </Card>

        {/* ── 10. LOGIN PAGE ── */}
        <Card title="10 · Login / Auth Page">
          <div className="rounded-2xl p-6 max-w-xs mx-auto" style={{ background: C[100] }}>
            <div className="bg-white rounded-2xl shadow-sm p-6 border" style={{ borderColor: C[200] }}>
              <div className="text-center mb-5">
                <img src="/logo.jpg" alt="logo" className="h-20 w-auto mx-auto mb-2 rounded-xl" />
                <p className="text-sm font-semibold" style={{ color: C[900] }}>The Bliss Massage at Home</p>
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium mb-4" style={{ borderColor: C[200], color: C[700] }}>
                <span className="text-red-500 font-bold">G</span> เข้าสู่ระบบด้วย Google
              </button>
              <div className="flex items-center gap-2 mb-4">
                <hr className="flex-1" style={{ borderColor: C[200] }} /><span className="text-xs" style={{ color: C[400] }}>หรือ</span><hr className="flex-1" style={{ borderColor: C[200] }} />
              </div>
              <input readOnly placeholder="อีเมล" className="w-full px-4 py-3 rounded-xl border text-sm mb-3 outline-none block" style={{ background: C[50], borderColor: C[300] }} />
              <input readOnly placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border text-sm mb-4 outline-none block" style={{ background: C[50], borderColor: C[300] }} />
              <button className="w-full py-3 rounded-xl text-white text-sm font-medium" style={{ background: C[600] }}>เข้าสู่ระบบ</button>
            </div>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: C[400] }}>AuthLayout: className=&quot;bg-[#f2ede9]&quot; · Card: bg-white rounded-2xl · Button: bg-bliss-600 [background-image:none]</p>
        </Card>

        {/* ── FOOTER ── */}
        <div className="rounded-2xl py-10 px-6 text-center" style={{ background: C[800] }}>
          <img src="/logo.jpg" alt="The Bliss" className="h-16 w-auto mx-auto mb-4 rounded-xl opacity-90" />
          <p className="text-xs tracking-widest font-light" style={{ color: C[300] }}>THE BLISS MASSAGE AT HOME</p>
          <p className="text-xs mt-1" style={{ color: C[500] }}>UI Design Guide · Warm Earth Collection · 2026</p>
          <div className="mt-4 flex justify-center gap-2">
            {Object.entries(C).filter((_, i) => i % 2 === 0).map(([, hex]) => (
              <div key={hex} className="w-5 h-5 rounded-full border border-white/10" style={{ background: hex }} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
