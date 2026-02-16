/**
 * Privacy Policy Page
 * นโยบายความเป็นส่วนตัว
 */

import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield, Lock, Eye, FileText, UserCheck, Globe } from 'lucide-react'

export default function PrivacyPage() {
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
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-amber-600" />
            <div>
              <h1 className="text-4xl font-bold text-stone-900">นโยบายความเป็นส่วนตัว</h1>
              <p className="text-stone-600">Privacy Policy</p>
            </div>
          </div>
          <p className="text-sm text-stone-500 mt-4">
            อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>สำคัญ:</strong> The Bliss Massage at Home ให้ความสำคัญกับความเป็นส่วนตัวและความปลอดภัยของข้อมูลของท่าน
              นโยบายนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของท่าน
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-100">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">เนื้อหาในนโยบาย</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: FileText, text: 'ข้อมูลที่เรา เก็บรวบรวม', href: '#section-1' },
              { icon: Lock, text: 'วิธีการใช้ข้อมูล', href: '#section-2' },
              { icon: Eye, text: 'การเปิดเผยข้อมูล', href: '#section-3' },
              { icon: Shield, text: 'ความปลอดภัย', href: '#section-4' },
              { icon: UserCheck, text: 'สิทธิของท่าน', href: '#section-5' },
              { icon: Globe, text: 'คุกกี้และเทคโนโลยี', href: '#section-6' },
            ].map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition border border-stone-200"
              >
                <item.icon className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-stone-700">{item.text}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          <div className="prose prose-stone max-w-none">

            {/* Section 1 */}
            <section id="section-1" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">1. ข้อมูลที่เราเก็บรวบรวม</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">1.1 ข้อมูลที่ท่านให้โดยตรง</h3>
              <p className="text-stone-700 mb-2">เมื่อท่านลงทะเบียนและใช้บริการ เราจะเก็บข้อมูลดังต่อไปนี้:</p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>ข้อมูลส่วนตัว:</strong> ชื่อ-นามสกุล, อีเมล, เบอร์โทรศัพท์, วันเกิด, เพศ</li>
                <li><strong>ที่อยู่:</strong> ที่อยู่สำหรับการให้บริการ, รหัสไปรษณีย์</li>
                <li><strong>ข้อมูลสุขภาพ:</strong> โรคประจำตัว, ประวัติการแพ้, ข้อจำกัดทางสุขภาพ (เพื่อความปลอดภัย)</li>
                <li><strong>ข้อมูลการชำระเงิน:</strong> หมายเลขบัตรเครดิต/เดบิต (เข้ารหัสแล้ว), ข้อมูลการทำธุรกรรม</li>
                <li><strong>รูปภาพโปรไฟล์:</strong> หากท่านเลือกที่จะอัปโหลด</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">1.2 ข้อมูลที่เก็บอัตโนมัติ</h3>
              <p className="text-stone-700 mb-2">เมื่อท่านใช้แพลตฟอร์มของเรา เราอาจเก็บข้อมูลเหล่านี้โดยอัตโนมัติ:</p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>ข้อมูลอุปกรณ์:</strong> ประเภทอุปกรณ์, ระบบปฏิบัติการ, เบราว์เซอร์</li>
                <li><strong>ข้อมูลการใช้งาน:</strong> หน้าที่เข้าชม, เวลาที่ใช้, การคลิก, ประวัติการค้นหา</li>
                <li><strong>ข้อมูลที่ตั้ง:</strong> ที่ตั้ง GPS (เมื่อได้รับอนุญาต), IP Address</li>
                <li><strong>คุกกี้:</strong> ดูรายละเอียดในหัวข้อ "คุกกี้และเทคโนโลยีการติดตาม"</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">1.3 ข้อมูลจากแหล่งอื่น</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li><strong>โซเชียลมีเดีย:</strong> หากท่านเข้าสู่ระบบด้วย Google หรือ Facebook</li>
                <li><strong>บริษัทคู่ค้า:</strong> เช่น ระบบชำระเงิน, บริการยืนยันตัวตน</li>
                <li><strong>แหล่งข้อมูลสาธารณะ:</strong> ข้อมูลที่เผยแพร่ต่อสาธารณะ</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">2. วิธีการใช้ข้อมูลของท่าน</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.1 การให้บริการ</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>สร้างและจัดการบัญชีผู้ใช้</li>
                <li>ประมวลผลการจองและการชำระเงิน</li>
                <li>จัดส่งนักบำบัดไปยังที่อยู่ของท่าน</li>
                <li>ติดต่อสื่อสารเกี่ยวกับการจองและบริการ</li>
                <li>ให้บริการลูกค้า และแก้ไขปัญหา</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.2 การปรับปรุงและพัฒนา</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>วิเคราะห์พฤติกรรมการใช้งานเพื่อปรับปรุงบริการ</li>
                <li>พัฒนาฟีเจอร์และบริการใหม่</li>
                <li>ทำวิจัยและสถิติ</li>
                <li>แนะนำบริการที่เหมาะสมกับท่าน</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.3 การตลาดและการสื่อสาร</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li>ส่งข่าวสาร โปรโมชัน และข้อเสนอพิเศษ (เมื่อได้รับความยินยอม)</li>
                <li>แจ้งเตือนเกี่ยวกับบริการใหม่</li>
                <li>ทำแบบสำรวจความพึงพอใจ</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">2.4 ความปลอดภัยและการปฏิบัติตามกฎหมาย</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>ป้องกันการทุจริตและการใช้งานที่ไม่เหมาะสม</li>
                <li>ปฏิบัติตามกฎหมายและระเบียบข้อบังคับ</li>
                <li>ดำเนินการตามคำสั่งศาลหรือหน่วยงานราชการ</li>
                <li>ปกป้องสิทธิและความปลอดภัยของเราและผู้อื่น</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">3. การเปิดเผยและแบ่งปันข้อมูล</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.1 บุคคลที่เราอาจแบ่งปันข้อมูล</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>นักบำบัด:</strong> ข้อมูลที่จำเป็นสำหรับการให้บริการ (ชื่อ, ที่อยู่, เบอร์โทร, ข้อมูลสุขภาพ)</li>
                <li><strong>ผู้ให้บริการชำระเงิน:</strong> ข้อมูลการทำธุรกรรมที่จำเป็น (เข้ารหัสอย่างปลอดภัย)</li>
                <li><strong>ผู้ให้บริการคลาวด์:</strong> สำหรับเก็บข้อมูลและโฮสติ้ง</li>
                <li><strong>ผู้ให้บริการวิเคราะห์:</strong> เช่น Google Analytics (ข้อมูลที่ไม่ระบุตัวตน)</li>
                <li><strong>บริษัทในเครือ:</strong> สำหรับการดำเนินธุรกิจ</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.2 กรณีที่เราอาจเปิดเผยข้อมูล</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>เมื่อมีการยินยอม:</strong> เมื่อท่านอนุญาตให้เราเปิดเผยข้อมูล</li>
                <li><strong>ตามกฎหมาย:</strong> เมื่อมีคำสั่งศาล หรือหน่วยงานบังคับใช้กฎหมายร้องขอ</li>
                <li><strong>ปกป้องสิทธิ์:</strong> เพื่อปกป้องสิทธิ์ ทรัพย์สิน หรือความปลอดภัยของเราหรือผู้อื่น</li>
                <li><strong>การขายกิจการ:</strong> ในกรณีที่มีการควบรวมกิจการ หรือขายสินทรัพย์</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">3.3 การส่งข้อมูลข้ามประเทศ</h3>
              <p className="text-stone-700">
                ข้อมูลของท่านอาจถูกเก็บและประมวลผลในประเทศไทยหรือประเทศอื่นๆ ที่เรามีผู้ให้บริการ
                เราจะดำเนินการให้แน่ใจว่าข้อมูลของท่านได้รับการคุ้มครองตามมาตรฐานสากล
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">4. ความปลอดภัยของข้อมูล</h2>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-4">
                <p className="text-green-900 mb-2">
                  <strong>มาตรการความปลอดภัยของเรา:</strong>
                </p>
                <ul className="list-disc pl-6 text-green-800 space-y-2">
                  <li>การเข้ารหัสข้อมูล SSL/TLS สำหรับการส่งข้อมูล</li>
                  <li>การเข้ารหัสข้อมูลที่เก็บในฐานข้อมูล</li>
                  <li>การควบคุมการเข้าถึงอย่างเข้มงวด</li>
                  <li>การตรวจสอบความปลอดภัยเป็นประจำ</li>
                  <li>การฝึกอบรมพนักงานเรื่องความเป็นส่วนตัว</li>
                </ul>
              </div>

              <p className="text-stone-700 mb-4">
                แม้ว่าเราจะใช้มาตรการความปลอดภัยที่เหมาะสม แต่ไม่มีระบบใดที่ปลอดภัย 100%
                หากท่านพบพฤติกรรมที่น่าสงสัย กรุณาแจ้งให้เราทราบทันที
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">4.1 การรักษาความปลอดภัยของท่าน</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>ใช้รหัสผ่านที่แข็งแรงและไม่ซ้ำกับบริการอื่น</li>
                <li>เปิดใช้การยืนยันตัวตนแบบสองชั้น (2FA)</li>
                <li>ไม่แบ่งปันรหัสผ่านกับผู้อื่น</li>
                <li>ออกจากระบบเมื่อใช้งานเสร็จ โดยเฉพาะบนอุปกรณ์สาธารณะ</li>
                <li>ระวังอีเมลหรือข้อความฟิชชิ่ง</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">5. สิทธิของท่านตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</h2>

              <p className="text-stone-700 mb-4">
                ท่านมีสิทธิต่างๆ ในการจัดการข้อมูลส่วนบุคคลของท่าน ดังนี้:
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.1 สิทธิในการเข้าถึงข้อมูล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถขอเข้าถึงและรับสำเนาข้อมูลส่วนบุคคลของท่านที่เราเก็บรักษาไว้
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.2 สิทธิในการแก้ไขข้อมูล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถขอแก้ไขหรืออัปเดตข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.3 สิทธิในการลบข้อมูล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถขอให้เราลบข้อมูลของท่าน ยกเว้นกรณีที่เราต้องเก็บไว้ตามกฎหมาย
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.4 สิทธิในการจำกัดการประมวลผล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถขอให้เราจำกัดการใช้ข้อมูลของท่านในบางกรณี
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.5 สิทธิในการโอนย้ายข้อมูล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถขอรับข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่องจักร หรือขอให้เราโอนข้อมูลไปยังผู้ควบคุมข้อมูลอื่น
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.6 สิทธิในการคัดค้านการประมวลผล</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถคัดค้านการประมวลผลข้อมูลของท่าน เช่น การตลาดโดยตรง
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">5.7 สิทธิในการถอนความยินยอม</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถถอนความยินยอมที่ให้ไว้ได้ตลอดเวลา โดยไม่กระทบต่อความชอบด้วยกฎหมายของการประมวลผลที่ทำไปแล้ว
              </p>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6">
                <p className="text-blue-900 mb-2">
                  <strong>วิธีการใช้สิทธิ์:</strong>
                </p>
                <p className="text-blue-800">
                  หากท่านต้องการใช้สิทธิ์ใดๆ ข้างต้น กรุณาติดต่อเราที่ privacy@theblissathome.com
                  หรือผ่านช่องทางลูกค้าสัมพันธ์ เราจะตอบกลับภายใน 30 วัน
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="mb-8 scroll-mt-6">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">6. คุกกี้และเทคโนโลยีการติดตาม</h2>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.1 คุกกี้คืออะไร</h3>
              <p className="text-stone-700 mb-4">
                คุกกี้เป็นไฟล์ขนาดเล็กที่เว็บไซต์เก็บไว้ในอุปกรณ์ของท่าน เพื่อจดจำการตั้งค่าและปรับปรุงประสบการณ์การใช้งาน
              </p>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.2 ประเภทของคุกกี้ที่เราใช้</h3>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>คุกกี้ที่จำเป็น:</strong> จำเป็นสำหรับการทำงานของเว็บไซต์ (เช่น เก็บสถานะการล็อกอิน)</li>
                <li><strong>คุกกี้การวิเคราะห์:</strong> ช่วยให้เราเข้าใจว่าผู้ใช้งานโต้ตอบกับเว็บไซต์อย่างไร</li>
                <li><strong>คุกกี้การตลาด:</strong> ใช้เพื่อแสดงโฆษณาที่เกี่ยวข้อง</li>
                <li><strong>คุกกี้การปรับแต่ง:</strong> จดจำการตั้งค่าของท่าน เช่น ภาษา</li>
              </ul>

              <h3 className="text-xl font-medium text-stone-800 mb-3 mt-4">6.3 การจัดการคุกกี้</h3>
              <p className="text-stone-700 mb-4">
                ท่านสามารถควบคุมหรือลบคุกกี้ได้ตามต้องการผ่านการตั้งค่าเบราว์เซอร์ของท่าน
                อย่างไรก็ตาม การปิดคุกกี้บางประเภทอาจส่งผลต่อการทำงานของเว็บไซต์
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">7. การเก็บรักษาข้อมูล</h2>
              <p className="text-stone-700 mb-4">
                เราจะเก็บรักษาข้อมูลส่วนบุคคลของท่านเท่าที่จำเป็นเพื่อบรรลุวัตถุประสงค์ที่ระบุในนโยบายนี้
                หรือตามที่กฎหมายกำหนด
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li><strong>ข้อมูลบัญชีที่ใช้งานอยู่:</strong> เก็บไว้ตราบเท่าที่บัญชียังใช้งานอยู่</li>
                <li><strong>ข้อมูลการทำธุรกรรม:</strong> อย่างน้อย 5 ปี (ตามกฎหมายภาษี)</li>
                <li><strong>บันทึกการสื่อสาร:</strong> 2 ปี</li>
                <li><strong>ข้อมูลการตลาด:</strong> จนกว่าท่านจะถอนความยินยอม</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">8. เด็กและผู้เยาว์</h2>
              <p className="text-stone-700 mb-4">
                บริการของเราไม่ได้มุ่งเป้าไปที่เด็กอายุต่ำกว่า 18 ปี
                เราไม่เจตนาเก็บรวบรวมข้อมูลส่วนบุคคลจากเด็กโดยตรง
              </p>
              <p className="text-stone-700">
                หากท่านเป็นผู้ปกครองและเชื่อว่าบุตรของท่านให้ข้อมูลส่วนบุคคลแก่เรา
                กรุณาติดต่อเราเพื่อให้เราดำเนินการลบข้อมูลนั้น
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">9. การเปลี่ยนแปลงนโยบาย</h2>
              <p className="text-stone-700 mb-4">
                เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เพื่อให้สอดคล้องกับการเปลี่ยนแปลงของกฎหมาย
                แนวปฏิบัติ หรือบริการของเรา
              </p>
              <p className="text-stone-700">
                เราจะแจ้งให้ท่านทราบเกี่ยวกับการเปลี่ยนแปลงที่สำคัญผ่านอีเมลหรือการแจ้งเตือนบนแพลตฟอร์ม
                การใช้บริการต่อไปหลังจากการเปลี่ยนแปลงถือว่าท่านยอมรับนโยบายใหม่
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">10. การติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล</h2>
              <p className="text-stone-700 mb-4">
                หากท่านมีคำถาม ข้อกังวล หรือต้องการใช้สิทธิ์ตาม PDPA กรุณาติดต่อ:
              </p>
              <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                <p className="text-stone-700 mb-2"><strong>เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)</strong></p>
                <p className="text-stone-700 mb-2"><strong>The Bliss Massage at Home Co., Ltd.</strong></p>
                <p className="text-stone-700 mb-2">อีเมล: privacy@theblissathome.com</p>
                <p className="text-stone-700 mb-2">โทรศัพท์: 02-XXX-XXXX ต่อ 123</p>
                <p className="text-stone-700 mb-2">ไลน์: @theblissathome</p>
                <p className="text-stone-700 mb-4">เวลาทำการ: จันทร์-ศุกร์ 09:00-18:00 น.</p>
                <p className="text-sm text-stone-600">
                  เราจะพยายามตอบกลับคำขอของท่านภายใน 30 วัน
                  หากต้องใช้เวลานานกว่านั้น เราจะแจ้งให้ท่านทราบ
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-stone-900 mb-4">11. การร้องเรียน</h2>
              <p className="text-stone-700 mb-4">
                หากท่านไม่พอใจกับการตอบกลับของเราเกี่ยวกับข้อมูลส่วนบุคคล ท่านมีสิทธิ์ยื่นเรื่องร้องเรียนต่อ:
              </p>
              <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                <p className="text-amber-900 mb-2"><strong>สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</strong></p>
                <p className="text-amber-800 mb-2">เว็บไซต์: www.pdpc.or.th</p>
                <p className="text-amber-800">โทรศัพท์: 02-141-6993</p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  ความมุ่งมั่นของเราต่อความเป็นส่วนตัว
                </h3>
                <p className="text-sm text-amber-800">
                  The Bliss Massage at Home มุ่งมั่นที่จะปกป้องความเป็นส่วนตัวและข้อมูลของท่าน
                  เราจะใช้ข้อมูลของท่านด้วยความรับผิดชอบและโปร่งใส
                  หากมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อเราได้ตลอดเวลา
                </p>
              </div>
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
            to="/terms"
            className="px-6 py-3 bg-white text-stone-700 border-2 border-stone-300 rounded-xl hover:border-amber-500 transition font-medium"
          >
            อ่านเงื่อนไขการให้บริการ
          </Link>
        </div>
      </div>
    </div>
  )
}
