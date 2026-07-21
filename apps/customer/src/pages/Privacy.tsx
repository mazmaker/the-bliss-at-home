/**
 * Privacy Policy Page
 * นโยบายความเป็นส่วนตัว
 */

import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield, Lock, Eye, FileText, UserCheck, Globe } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['legal', 'common'])
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : i18n.language === 'kr' ? 'ko-KR' : i18n.language === 'jp' ? 'ja-JP' : 'th-TH'

  return (
    <div className="min-h-screen bg-bliss-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-bliss-700 hover:text-bliss-600 mb-6 font-medium transition"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('common:buttons.goBack')}
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-bliss-100">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-bliss-600" />
            <div>
              <h1 className="text-4xl font-bold text-bliss-900">{t('legal:privacy.title')}</h1>
              <p className="text-bliss-700">{t('legal:privacy.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-bliss-500 mt-4">
            {t('legal:privacy.lastUpdated', { date: new Date().toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) })}
          </p>
          <div className="mt-6 p-4 bg-bliss-100 rounded-lg border border-bliss-300">
            <p className="text-sm text-bliss-800">
              <strong>{t('legal:privacy.importantLabel')}</strong> {t('legal:privacy.importantText')}
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-bliss-100">
          <h3 className="text-lg font-semibold text-bliss-900 mb-4">{t('legal:privacy.tocHeading')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: FileText, text: t('legal:privacy.toc.collect'), href: '#section-1' },
              { icon: Lock, text: t('legal:privacy.toc.use'), href: '#section-2' },
              { icon: Eye, text: t('legal:privacy.toc.disclose'), href: '#section-3' },
              { icon: Shield, text: t('legal:privacy.toc.security'), href: '#section-4' },
              { icon: UserCheck, text: t('legal:privacy.toc.rights'), href: '#section-5' },
              { icon: Globe, text: t('legal:privacy.toc.cookies'), href: '#section-6' },
            ].map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-bliss-100 transition border border-bliss-200"
              >
                <item.icon className="w-5 h-5 text-bliss-600" />
                <span className="text-sm text-bliss-700">{item.text}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-bliss-100">
          <div className="prose prose-stone max-w-none">

            {/* Section 1 */}
            <section id="section-1" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s1.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s1.h1')}</h3>
              <p className="text-bliss-700 mb-2">{t('legal:privacy.s1.p1')}</p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:privacy.s1.li1.label')}</strong> {t('legal:privacy.s1.li1.text')}</li>
                <li><strong>{t('legal:privacy.s1.li2.label')}</strong> {t('legal:privacy.s1.li2.text')}</li>
                <li><strong>{t('legal:privacy.s1.li3.label')}</strong> {t('legal:privacy.s1.li3.text')}</li>
                <li><strong>{t('legal:privacy.s1.li4.label')}</strong> {t('legal:privacy.s1.li4.text')}</li>
                <li><strong>{t('legal:privacy.s1.li5.label')}</strong> {t('legal:privacy.s1.li5.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s1.h2')}</h3>
              <p className="text-bliss-700 mb-2">{t('legal:privacy.s1.p2')}</p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:privacy.s1.li6.label')}</strong> {t('legal:privacy.s1.li6.text')}</li>
                <li><strong>{t('legal:privacy.s1.li7.label')}</strong> {t('legal:privacy.s1.li7.text')}</li>
                <li><strong>{t('legal:privacy.s1.li8.label')}</strong> {t('legal:privacy.s1.li8.text')}</li>
                <li><strong>{t('legal:privacy.s1.li9.label')}</strong> {t('legal:privacy.s1.li9.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s1.h3')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li><strong>{t('legal:privacy.s1.li10.label')}</strong> {t('legal:privacy.s1.li10.text')}</li>
                <li><strong>{t('legal:privacy.s1.li11.label')}</strong> {t('legal:privacy.s1.li11.text')}</li>
                <li><strong>{t('legal:privacy.s1.li12.label')}</strong> {t('legal:privacy.s1.li12.text')}</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s2.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s2.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:privacy.s2.li1')}</li>
                <li>{t('legal:privacy.s2.li2')}</li>
                <li>{t('legal:privacy.s2.li3')}</li>
                <li>{t('legal:privacy.s2.li4')}</li>
                <li>{t('legal:privacy.s2.li5')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s2.h2')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:privacy.s2.li6')}</li>
                <li>{t('legal:privacy.s2.li7')}</li>
                <li>{t('legal:privacy.s2.li8')}</li>
                <li>{t('legal:privacy.s2.li9')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s2.h3')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:privacy.s2.li10')}</li>
                <li>{t('legal:privacy.s2.li11')}</li>
                <li>{t('legal:privacy.s2.li12')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s2.h4')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li>{t('legal:privacy.s2.li13')}</li>
                <li>{t('legal:privacy.s2.li14')}</li>
                <li>{t('legal:privacy.s2.li15')}</li>
                <li>{t('legal:privacy.s2.li16')}</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s3.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s3.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:privacy.s3.li1.label')}</strong> {t('legal:privacy.s3.li1.text')}</li>
                <li><strong>{t('legal:privacy.s3.li2.label')}</strong> {t('legal:privacy.s3.li2.text')}</li>
                <li><strong>{t('legal:privacy.s3.li3.label')}</strong> {t('legal:privacy.s3.li3.text')}</li>
                <li><strong>{t('legal:privacy.s3.li4.label')}</strong> {t('legal:privacy.s3.li4.text')}</li>
                <li><strong>{t('legal:privacy.s3.li5.label')}</strong> {t('legal:privacy.s3.li5.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s3.h2')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:privacy.s3.li6.label')}</strong> {t('legal:privacy.s3.li6.text')}</li>
                <li><strong>{t('legal:privacy.s3.li7.label')}</strong> {t('legal:privacy.s3.li7.text')}</li>
                <li><strong>{t('legal:privacy.s3.li8.label')}</strong> {t('legal:privacy.s3.li8.text')}</li>
                <li><strong>{t('legal:privacy.s3.li9.label')}</strong> {t('legal:privacy.s3.li9.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s3.h3')}</h3>
              <p className="text-bliss-700">
                {t('legal:privacy.s3.p3')}
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s4.heading')}</h2>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-4">
                <p className="text-green-900 mb-2">
                  <strong>{t('legal:privacy.s4.measuresLabel')}</strong>
                </p>
                <ul className="list-disc pl-6 text-green-800 space-y-2">
                  <li>{t('legal:privacy.s4.li1')}</li>
                  <li>{t('legal:privacy.s4.li2')}</li>
                  <li>{t('legal:privacy.s4.li3')}</li>
                  <li>{t('legal:privacy.s4.li4')}</li>
                  <li>{t('legal:privacy.s4.li5')}</li>
                </ul>
              </div>

              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s4.p1')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s4.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li>{t('legal:privacy.s4.li6')}</li>
                <li>{t('legal:privacy.s4.li7')}</li>
                <li>{t('legal:privacy.s4.li8')}</li>
                <li>{t('legal:privacy.s4.li9')}</li>
                <li>{t('legal:privacy.s4.li10')}</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s5.heading')}</h2>

              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p1')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h1')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p1text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h2')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p2text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h3')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p3text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h4')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p4text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h5')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p5text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h6')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p6text')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s5.h7')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s5.p7text')}
              </p>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6">
                <p className="text-blue-900 mb-2">
                  <strong>{t('legal:privacy.s5.howToLabel')}</strong>
                </p>
                <p className="text-blue-800">
                  {t('legal:privacy.s5.howToText')}
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s6.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s6.h1')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s6.p1')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s6.h2')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:privacy.s6.li1.label')}</strong> {t('legal:privacy.s6.li1.text')}</li>
                <li><strong>{t('legal:privacy.s6.li2.label')}</strong> {t('legal:privacy.s6.li2.text')}</li>
                <li><strong>{t('legal:privacy.s6.li3.label')}</strong> {t('legal:privacy.s6.li3.text')}</li>
                <li><strong>{t('legal:privacy.s6.li4.label')}</strong> {t('legal:privacy.s6.li4.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:privacy.s6.h3')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s6.p3')}
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s7.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s7.p1')}
              </p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li><strong>{t('legal:privacy.s7.li1.label')}</strong> {t('legal:privacy.s7.li1.text')}</li>
                <li><strong>{t('legal:privacy.s7.li2.label')}</strong> {t('legal:privacy.s7.li2.text')}</li>
                <li><strong>{t('legal:privacy.s7.li3.label')}</strong> {t('legal:privacy.s7.li3.text')}</li>
                <li><strong>{t('legal:privacy.s7.li4.label')}</strong> {t('legal:privacy.s7.li4.text')}</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s8.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s8.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:privacy.s8.p2')}
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s9.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s9.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:privacy.s9.p2')}
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s10.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s10.p1')}
              </p>
              <div className="bg-bliss-100 p-6 rounded-lg border border-bliss-200">
                <p className="text-bliss-700 mb-2"><strong>{t('legal:privacy.s10.dpo')}</strong></p>
                <p className="text-bliss-700 mb-2"><strong>{t('legal:privacy.s10.company')}</strong></p>
                <p className="text-bliss-700 mb-2">{t('legal:privacy.s10.email')}</p>
                <p className="text-bliss-700 mb-2">{t('legal:privacy.s10.phone')}</p>
                <p className="text-bliss-700 mb-2">{t('legal:privacy.s10.line')}</p>
                <p className="text-bliss-700 mb-4">{t('legal:privacy.s10.hours')}</p>
                <p className="text-sm text-bliss-700">
                  {t('legal:privacy.s10.responseNote')}
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:privacy.s11.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:privacy.s11.p1')}
              </p>
              <div className="bg-bliss-100 p-6 rounded-lg border border-bliss-300">
                <p className="text-bliss-800 mb-2"><strong>{t('legal:privacy.s11.office')}</strong></p>
                <p className="text-bliss-700 mb-2">{t('legal:privacy.s11.website')}</p>
                <p className="text-bliss-700">{t('legal:privacy.s11.phone')}</p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-bliss-200">
              <div className="bg-bliss-100 p-6 rounded-lg border border-bliss-300">
                <h3 className="text-lg font-semibold text-bliss-800 mb-2">
                  {t('legal:privacy.footer.heading')}
                </h3>
                <p className="text-sm text-bliss-700">
                  {t('legal:privacy.footer.text')}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Quick Action */}
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-bliss-600 text-white rounded-xl hover:bg-bliss-700 transition font-medium"
          >
            {t('common:buttons.goBack')}
          </button>
          <Link
            to="/terms"
            className="px-6 py-3 bg-bliss-50 text-bliss-700 border-2 border-bliss-300 rounded-xl hover:border-bliss-600 transition font-medium"
          >
            {t('legal:privacy.readTerms')}
          </Link>
        </div>
      </div>
    </div>
  )
}
