import { X, Calculator, DollarSign, Percent, TrendingUp } from 'lucide-react'

interface PayoutCalculationModalProps {
  onClose: () => void
}

export function PayoutCalculationModal({ onClose }: PayoutCalculationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calculator className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">รายละเอียดการคำนวณ</h2>
              <p className="text-sm text-stone-600 mt-1">วิธีการคำนวณรายได้พนักงาน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* System Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ภาพรวมระบบการจ่ายเงิน
            </h3>
            <p className="text-sm text-blue-800">
              ระบบคำนวณรายได้พนักงานจากค่าคอมมิชชั่นของงานที่ทำสำเร็จในแต่ละรอบ (รายสัปดาห์/รายเดือน)
              โดยรายได้จากค่าคอมมิชชั่นเป็นยอดสุทธิที่พนักงานจะได้รับ ไม่มีการหักค่าใช้จ่ายเพิ่มเติม
            </p>
          </div>

          {/* Calculation Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-stone-900 text-lg">ขั้นตอนการคำนวณ</h3>

            {/* Step 1 */}
            <div className="border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-stone-900 mb-2">คำนวณรายได้จากค่าคอมมิชชั่น</h4>
                  <div className="bg-stone-50 rounded-lg p-3 mb-2">
                    <p className="text-sm font-mono text-stone-700">
                      รายได้ต่องาน = ราคาบริการ × อัตราคอมมิชชั่นของบริการนั้น
                    </p>
                  </div>
                  <p className="text-sm text-stone-600">
                    แต่ละบริการมีอัตราคอมมิชชั่นที่กำหนดไว้ พนักงานจะได้รับส่วนแบ่งตามอัตรานี้
                  </p>
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-medium">ตัวอย่าง</p>
                    <p className="text-sm text-green-800 mt-1">
                      นวดไทย ฿690 × 50% = <strong>฿345</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-stone-900 mb-2">รวมรายได้ทั้งหมดในรอบ</h4>
                  <div className="bg-stone-50 rounded-lg p-3 mb-2">
                    <p className="text-sm font-mono text-stone-700">
                      รายได้รวม = Σ (รายได้จากแต่ละงานที่สำเร็จ)
                    </p>
                  </div>
                  <p className="text-sm text-stone-600">
                    รวมรายได้จากค่าคอมมิชชั่นของงานทั้งหมดที่สถานะเป็น "เสร็จสิ้น" ในช่วงเวลาที่กำหนด
                    รายได้นี้เป็นยอดสุทธิที่พนักงานจะได้รับ ไม่มีการหักค่าใช้จ่ายเพิ่มเติม
                  </p>
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-medium">ตัวอย่าง</p>
                    <p className="text-sm text-blue-800 mt-1">
                      งานที่ 1: ฿345 + งานที่ 2: ฿300 + งานที่ 3: ฿175 = <strong>฿820</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-semibold">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-2">ยอดโอนทั้งหมด (Total Payout)</h4>
                  <div className="bg-white rounded-lg p-3 mb-2 border border-amber-200">
                    <p className="text-sm font-mono text-amber-900 font-semibold">
                      ยอดโอน = รายได้สุทธิ
                    </p>
                  </div>
                  <p className="text-sm text-amber-800">
                    ยอดเงินสุทธิที่พนักงานจะได้รับโอนเข้าบัญชี
                  </p>
                  <div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium">ตัวอย่าง</p>
                    <p className="text-lg text-amber-900 mt-1 font-bold">
                      <span className="text-2xl">฿2,210</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <h3 className="font-semibold text-stone-900 mb-3">สรุปการคำนวณ</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-200">
                <tr>
                  <td className="py-2 text-stone-600">รายได้รวมจากงาน</td>
                  <td className="py-2 text-right font-medium text-green-700">+฿2,600</td>
                </tr>
                <tr>
                  <td className="py-2 text-stone-600">ค่าธรรมเนียมแพลตฟอร์ม (15%)</td>
                  <td className="py-2 text-right font-medium text-red-700">-฿390</td>
                </tr>
                <tr className="bg-amber-100 border-t-2 border-amber-300">
                  <td className="py-2 font-semibold text-amber-900">รายได้สุทธิ / ยอดโอนทั้งหมด</td>
                  <td className="py-2 text-right font-bold text-xl text-amber-900">฿2,210</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>หมายเหตุ:</strong> ตัวเลขที่แสดงเป็นเพียงตัวอย่าง
              ระบบจะคำนวณจากข้อมูลจริงของแต่ละพนักงานและแต่ละรอบการจ่ายเงิน
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  )
}
