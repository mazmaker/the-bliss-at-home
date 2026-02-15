/**
 * Terms of Service Page
 * เงื่อนไขการให้บริการ
 */

import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-stone-600 hover:text-amber-700 mb-6 font-medium transition"
        >
          <ChevronLeft className="w-5 h-5" />
          กลับไปหน้าก่อนหน้า
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-stone-100">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">เงื่อนไขการให้บริการ</h1>
          <p className="text-stone-600">Terms of Service</p>
          <p className="text-sm text-stone-500 mt-4">
            อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          <div className="prose prose-stone max-w-none">

            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">1. การยอมรับเงื่อนไข</h2>
              <p className="text-stone-700 mb-4">
                ยินดีต้อนรับสู่ The Bliss Massage at Home การใช้บริการของเราถือว่าท่านได้อ่าน เข้าใจ และยอมรับเงื่อนไขการให้บริการทั้งหมดนี้
                หากท่านไม่เห็นด้วยกับเงื่อนไขใดๆ กรุณาอย่าใช้บริการของเรา
              </p>
              <p className="text-stone-700">
                เงื่อนไขการให้บริการนี้ครอบคลุมการใช้งานทั้งแพลตฟอร์มออนไลน์ แอปพลิเคชัน และบริการสปาที่บ้าน รวมถึงการจัดการข้อมูลส่วนบุคคล
                การชำระเงิน และสิทธิต่างๆ ของผู้ใช้บริการ
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">2. การลงทะเบียนและบัญชีผู้ใช้</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.1 ข้อกำหนดในการลงทะเบียน</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>ท่านต้องมีอายุไม่ต่ำกว่า 18 ปีบริบูรณ์</li>
                <li>ข้อมูลที่ให้ต้องถูกต้อง ครบถ้วน และเป็นปัจจุบัน</li>
                <li>ท่านต้องรักษาความลับของรหัสผ่านและข้อมูลบัญชี</li>
                <li>ห้ามใช้ชื่อผู้ใช้ที่ไม่เหมาะสม หยาบคาย หรือละเมิดสิทธิผู้อื่น</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.2 ความรับผิดชอบของผู้ใช้</h3>
              <p className="text-stone-700 mb-4">
                ท่านมีหน้าที่รับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของท่าน หากพบว่ามีการใช้บัญชีโดยไม่ได้รับอนุญาต
                กรุณาแจ้งให้เราทราบทันที
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.3 การยกเลิกบัญชี</h3>
              <p className="text-stone-700">
                เราขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีของท่าน หากพบว่ามีการละเมิดเงื่อนไขการให้บริการ หรือมีพฤติกรรมที่ไม่เหมาะสม
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">3. การใช้บริการ</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.1 บริการที่ให้</h3>
              <p className="text-stone-700 mb-4">
                The Bliss Massage at Home ให้บริการสปาและนวดที่บ้าน ผ่านแพลตฟอร์มออนไลน์ที่ผู้ใช้สามารถ:
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>เรียกดูและเลือกบริการสปาที่หลากหลาย</li>
                <li>จองนัดหมายและเลือกช่วงเวลาที่สะดวก</li>
                <li>ชำระเงินออนไลน์อย่างปลอดภัย</li>
                <li>ติดตามสถานะการจอง</li>
                <li>ให้คะแนนและรีวิวบริการ</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.2 การจองบริการ</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>การจองจะมีผลสมบูรณ์เมื่อได้รับการยืนยันจากระบบเท่านั้น</li>
                <li>กรุณาจองล่วงหน้าอย่างน้อย 24 ชั่วโมง</li>
                <li>ท่านต้องให้ข้อมูลที่อยู่และการติดต่อที่ถูกต้อง</li>
                <li>ต้องแจ้งล่วงหน้าหากมีโรคประจำตัวหรือภาวะสุขภาพพิเศษ</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.3 ข้อห้าม</h3>
              <p className="text-stone-700 mb-2">ท่านตกลงที่จะไม่:</p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือไม่เหมาะสม</li>
                <li>รบกวนหรือขัดขวางการทำงานของระบบ</li>
                <li>พยายามเข้าถึงข้อมูลที่ไม่ได้รับอนุญาต</li>
                <li>คัดลอก ดัดแปลง หรือทำซ้ำเนื้อหาใดๆ ของเราโดยไม่ได้รับอนุญาต</li>
                <li>ใช้ระบบอัตโนมัติหรือบอทในการจองบริการ</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">4. ราคาและการชำระเงิน</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">4.1 ราคาบริการ</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>ราคาที่แสดงเป็นราคาเริ่มต้นและอาจมีการเปลี่ยนแปลง</li>
                <li>ราคาไม่รวมค่าเดินทางพิเศษสำหรับพื้นที่ห่างไกล</li>
                <li>ราคารวม VAT 7% แล้ว</li>
                <li>เราขอสงวนสิทธิ์ในการเปลี่ยนแปลงราคาโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">4.2 วิธีการชำระเงิน</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>บัตรเครดิต/เดบิต (Visa, MasterCard, JCB)</li>
                <li>โอนเงินผ่านธนาคาร</li>
                <li>พร้อมเพย์</li>
                <li>เงินสด (ชำระเมื่อรับบริการ - สำหรับลูกค้าประจำเท่านั้น)</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">4.3 นโยบายการคืนเงิน</h3>
              <p className="text-stone-700 mb-2">การคืนเงินจะดำเนินการภายใน 7-14 วันทำการ ในกรณีดังต่อไปนี้:</p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>บริการไม่ตรงตามที่โฆษณา</li>
                <li>นักบำบัดไม่มาตามเวลานัดโดยไม่แจ้งล่วงหน้า</li>
                <li>คุณภาพบริการต่ำกว่ามาตรฐานอย่างชัดเจน</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">5. การยกเลิกและการเปลี่ยนแปลงการจอง</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.1 การยกเลิกโดยลูกค้า</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>ยกเลิกก่อน 24 ชั่วโมง:</strong> คืนเงิน 100%</li>
                <li><strong>ยกเลิกก่อน 12 ชั่วโมง:</strong> คืนเงิน 50%</li>
                <li><strong>ยกเลิกน้อยกว่า 12 ชั่วโมง:</strong> ไม่คืนเงิน</li>
                <li><strong>No Show:</strong> ไม่คืนเงินและอาจถูกระงับการใช้บริการชั่วคราว</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.2 การยกเลิกโดยบริษัท</h3>
              <p className="text-stone-700 mb-4">
                หากเราต้องยกเลิกการจองด้วยเหตุสุดวิสัย (เช่น นักบำบัดเจ็บป่วย อุบัติเหตุ) เราจะ:
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>แจ้งให้ท่านทราบทันทีที่เป็นไปได้</li>
                <li>นำเสนอการจองใหม่ในเวลาอื่น</li>
                <li>หรือคืนเงินเต็มจำนวนภายใน 7 วันทำการ</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">6. ความรับผิดชอบและข้อจำกัด</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.1 การให้บริการ</h3>
              <p className="text-stone-700 mb-4">
                เราพยายามอย่างเต็มที่เพื่อให้บริการที่มีคุณภาพ แต่เราไม่สามารถรับประกันผลลัพธ์เฉพาะบุคคลได้
                ผลของบริการอาจแตกต่างกันไปตามสภาพร่างกายและสุขภาพของแต่ละบุคคล
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.2 ข้อจำกัดความรับผิด</h3>
              <p className="text-stone-700 mb-2">เราจะไม่รับผิดชอบต่อ:</p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>การบาดเจ็บที่เกิดจากการปกปิดข้อมูลสุขภาพ</li>
                <li>ความเสียหายต่อทรัพย์สินส่วนบุคคล</li>
                <li>ความสูญเสียทางอ้อม เชิงลงโทษ หรือพิเศษ</li>
                <li>ข้อผิดพลาดจากบุคคลที่สาม</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.3 การประกันภัย</h3>
              <p className="text-stone-700">
                นักบำบัดของเราทุกคนได้รับการประกันภัยอุบัติเหตุและความรับผิดชอบส่วนบุคคล
                หากเกิดอุบัติเหตุระหว่างการให้บริการ เราจะดำเนินการเคลมประกันให้ตามกระบวนการ
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">7. ทรัพย์สินทางปัญญา</h2>
              <p className="text-stone-700 mb-4">
                เนื้อหาทั้งหมดบนแพลตฟอร์มนี้ รวมถึงข้อความ รูปภาพ โลโก้ ไอคอน และซอฟต์แวร์ เป็นทรัพย์สินของ The Bliss Massage at Home
                หรือผู้ให้อนุญาต และได้รับความคุ้มครองตามกฎหมายทรัพย์สินทางปัญญา
              </p>
              <p className="text-stone-700">
                ท่านไม่สามารถคัดลอก ทำซ้ำ แจกจ่าย หรือนำไปใช้เพื่อการพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจากเรา
              </p>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">8. ความเป็นส่วนตัว</h2>
              <p className="text-stone-700 mb-4">
                การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านจะเป็นไปตามนโยบายความเป็นส่วนตัวของเรา
                กรุณาอ่าน{' '}
                <Link to="/privacy" className="text-amber-700 hover:underline font-medium">
                  นโยบายความเป็นส่วนตัว
                </Link>{' '}
                เพื่อทำความเข้าใจว่าเราจัดการข้อมูลของท่านอย่างไร
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">9. การเปลี่ยนแปลงเงื่อนไข</h2>
              <p className="text-stone-700 mb-4">
                เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงเงื่อนไขการให้บริการนี้ได้ตลอดเวลา
                การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนเว็บไซต์
              </p>
              <p className="text-stone-700">
                เราจะแจ้งให้ท่านทราบเกี่ยวกับการเปลี่ยนแปลงที่สำคัญผ่านอีเมลหรือการแจ้งเตือนบนแพลตฟอร์ม
                การใช้บริการต่อไปถือว่าท่านยอมรับเงื่อนไขใหม่
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">10. กฎหมายที่ใช้บังคับ</h2>
              <p className="text-stone-700 mb-4">
                เงื่อนไขการให้บริการนี้อยู่ภายใต้บังคับและตีความตามกฎหมายของประเทศไทย
              </p>
              <p className="text-stone-700">
                ข้อพิพาทใดๆ ที่เกิดขึ้นจากหรือเกี่ยวกับเงื่อนไขนี้จะอยู่ภายใต้เขตอำนาจศาลของประเทศไทยเท่านั้น
              </p>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">11. การติดต่อเรา</h2>
              <p className="text-stone-700 mb-4">
                หากท่านมีคำถามหรือข้อสงสัยเกี่ยวกับเงื่อนไขการให้บริการนี้ กรุณาติดต่อเราที่:
              </p>
              <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                <p className="text-stone-700 mb-2"><strong>The Bliss Massage at Home</strong></p>
                <p className="text-stone-700 mb-2">อีเมล: support@theblissathome.com</p>
                <p className="text-stone-700 mb-2">โทรศัพท์: 02-XXX-XXXX</p>
                <p className="text-stone-700 mb-2">ไลน์: @theblissathome</p>
                <p className="text-stone-700">เวลาทำการ: จันทร์-อาทิตย์ 09:00-21:00 น.</p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <p className="text-sm text-stone-500 text-center">
                ขอบคุณที่ใช้บริการ The Bliss Massage at Home - ความผ่อนคลายและความสุขคือสิ่งที่เราห่วงใย
              </p>
            </div>

          </div>
        </div>

        {/* Quick Action */}
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition font-medium"
          >
            กลับไปหน้าก่อนหน้า
          </button>
          <Link
            to="/privacy"
            className="px-6 py-3 bg-white text-stone-700 border-2 border-stone-300 rounded-xl hover:border-amber-500 transition font-medium"
          >
            อ่านนโยบายความเป็นส่วนตัว
          </Link>
        </div>
      </div>
    </div>
  )
}
