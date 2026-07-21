/**
 * Terms of Service Page
 * เงื่อนไขการให้บริการ
 */

import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-bliss-900 mb-2">{t('legal:terms.title')}</h1>
          <p className="text-bliss-700">{t('legal:terms.subtitle')}</p>
          <p className="text-sm text-bliss-500 mt-4">
            {t('legal:terms.lastUpdated', { date: new Date().toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-bliss-100">
          <div className="prose prose-stone max-w-none">

            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s1.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s1.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:terms.s1.p2')}
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s2.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s2.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s2.li1')}</li>
                <li>{t('legal:terms.s2.li2')}</li>
                <li>{t('legal:terms.s2.li3')}</li>
                <li>{t('legal:terms.s2.li4')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s2.h2')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s2.p2')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s2.h3')}</h3>
              <p className="text-bliss-700">
                {t('legal:terms.s2.p3')}
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s3.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s3.h1')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s3.p1')}
              </p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s3.li1')}</li>
                <li>{t('legal:terms.s3.li2')}</li>
                <li>{t('legal:terms.s3.li3')}</li>
                <li>{t('legal:terms.s3.li4')}</li>
                <li>{t('legal:terms.s3.li5')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s3.h2')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s3.li6')}</li>
                <li>{t('legal:terms.s3.li7')}</li>
                <li>{t('legal:terms.s3.li8')}</li>
                <li>{t('legal:terms.s3.li9')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s3.h3')}</h3>
              <p className="text-bliss-700 mb-2">{t('legal:terms.s3.p3')}</p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li>{t('legal:terms.s3.li10')}</li>
                <li>{t('legal:terms.s3.li11')}</li>
                <li>{t('legal:terms.s3.li12')}</li>
                <li>{t('legal:terms.s3.li13')}</li>
                <li>{t('legal:terms.s3.li14')}</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s4.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s4.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s4.li1')}</li>
                <li>{t('legal:terms.s4.li2')}</li>
                <li>{t('legal:terms.s4.li3')}</li>
                <li>{t('legal:terms.s4.li4')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s4.h2')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s4.li5')}</li>
                <li>{t('legal:terms.s4.li6')}</li>
                <li>{t('legal:terms.s4.li7')}</li>
                <li>{t('legal:terms.s4.li8')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s4.h3')}</h3>
              <p className="text-bliss-700 mb-2">{t('legal:terms.s4.p3')}</p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li>{t('legal:terms.s4.li9')}</li>
                <li>{t('legal:terms.s4.li10')}</li>
                <li>{t('legal:terms.s4.li11')}</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s5.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s5.h1')}</h3>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li><strong>{t('legal:terms.s5.li1.label')}</strong> {t('legal:terms.s5.li1.text')}</li>
                <li><strong>{t('legal:terms.s5.li2.label')}</strong> {t('legal:terms.s5.li2.text')}</li>
                <li><strong>{t('legal:terms.s5.li3.label')}</strong> {t('legal:terms.s5.li3.text')}</li>
                <li><strong>{t('legal:terms.s5.li4.label')}</strong> {t('legal:terms.s5.li4.text')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s5.h2')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s5.p2')}
              </p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2">
                <li>{t('legal:terms.s5.li5')}</li>
                <li>{t('legal:terms.s5.li6')}</li>
                <li>{t('legal:terms.s5.li7')}</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s6.heading')}</h2>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s6.h1')}</h3>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s6.p1')}
              </p>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s6.h2')}</h3>
              <p className="text-bliss-700 mb-2">{t('legal:terms.s6.p2')}</p>
              <ul className="list-disc pl-6 text-bliss-700 space-y-2 mb-4">
                <li>{t('legal:terms.s6.li1')}</li>
                <li>{t('legal:terms.s6.li2')}</li>
                <li>{t('legal:terms.s6.li3')}</li>
                <li>{t('legal:terms.s6.li4')}</li>
              </ul>

              <h3 className="text-xl font-medium text-bliss-900 mb-3 mt-4">{t('legal:terms.s6.h3')}</h3>
              <p className="text-bliss-700">
                {t('legal:terms.s6.p3')}
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s7.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s7.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:terms.s7.p2')}
              </p>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s8.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s8.p1pre')}{' '}
                <Link to="/privacy" className="text-bliss-600 hover:underline font-medium">
                  {t('legal:terms.s8.p1link')}
                </Link>{' '}
                {t('legal:terms.s8.p1post')}
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s9.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s9.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:terms.s9.p2')}
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s10.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s10.p1')}
              </p>
              <p className="text-bliss-700">
                {t('legal:terms.s10.p2')}
              </p>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-bliss-900 mb-4">{t('legal:terms.s11.heading')}</h2>
              <p className="text-bliss-700 mb-4">
                {t('legal:terms.s11.p1')}
              </p>
              <div className="bg-bliss-100 p-6 rounded-lg border border-bliss-200">
                <p className="text-bliss-700 mb-2"><strong>{t('legal:terms.s11.company')}</strong></p>
                <p className="text-bliss-700 mb-2">{t('legal:terms.s11.email')}</p>
                <p className="text-bliss-700 mb-2">{t('legal:terms.s11.phone')}</p>
                <p className="text-bliss-700 mb-2">{t('legal:terms.s11.line')}</p>
                <p className="text-bliss-700">{t('legal:terms.s11.hours')}</p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-bliss-200">
              <p className="text-sm text-bliss-500 text-center">
                {t('legal:terms.footer')}
              </p>
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
            to="/privacy"
            className="px-6 py-3 bg-bliss-50 text-bliss-700 border-2 border-bliss-300 rounded-xl hover:border-bliss-600 transition font-medium"
          >
            {t('legal:terms.readPrivacy')}
          </Link>
        </div>
      </div>
    </div>
  )
}
