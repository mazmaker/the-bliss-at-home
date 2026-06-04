import React, { useState } from 'react'
import { Play, TestTube, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface TestResult {
  success: boolean
  processed: number
  errors: string[]
  timestamp: string
}

export function TestAutomatedPayout() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<TestResult | null>(null)

  async function runTest() {
    setIsRunning(true)
    try {
      console.log('🧪 Running automated payout test...')

      const serverUrl = process.env.NODE_ENV === 'production'
        ? 'https://the-bliss-at-home-server.vercel.app'
        : 'http://localhost:3000'

      const response = await fetch(`${serverUrl}/api/cron/daily-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      setLastResult(result)

      if (result.success) {
        toast.success(`✅ ทดสอบสำเร็จ! ดำเนินการ ${result.processed} คน`)
        console.log('🎉 Test completed successfully:', result)
      } else {
        toast.error(`❌ เกิดข้อผิดพลาด: ${result.errors?.[0] || 'Unknown error'}`)
        console.error('❌ Test failed:', result)
      }
    } catch (error) {
      console.error('💥 Error running test:', error)
      toast.error('❌ ไม่สามารถเรียกใช้ระบบทดสอบได้')
      setLastResult({
        success: false,
        processed: 0,
        errors: [error?.toString() || 'Network error'],
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            ทดสอบระบบอัตโนมัติ
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            ทดสอบการทำงานของระบบสร้าง payout อัตโนมัติ
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              กำลังทดสอบ...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              เริ่มทดสอบ
            </>
          )}
        </button>
      </div>

      {lastResult && (
        <div className={`border rounded-lg p-4 ${
          lastResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <h4 className={`font-medium ${
              lastResult.success ? 'text-green-900' : 'text-red-900'
            }`}>
              ผลการทดสอบ
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">เวลา:</span>
              <span className="font-medium">
                {new Date(lastResult.timestamp).toLocaleString('th-TH')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">สถานะ:</span>
              <span className={`font-medium ${
                lastResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {lastResult.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">ดำเนินการ:</span>
              <span className="font-medium">{lastResult.processed} คน</span>
            </div>
            {lastResult.errors.length > 0 && (
              <div>
                <span className="text-stone-600">ข้อผิดพลาด:</span>
                <div className="mt-1 space-y-1">
                  {lastResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-700 bg-red-100 rounded px-2 py-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">ข้อมูลการทดสอบ</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• ระบบจะตรวจสอบพนักงานที่ next_payout_date = วันนี้</li>
          <li>• สร้าง payout record สำหรับงานที่ completed ในช่วง period</li>
          <li>• ส่งแจ้งเตือนให้พนักงานที่ได้รับ payout</li>
          <li>• อัปเดต next_payout_date ตาม schedule</li>
        </ul>
      </div>
    </div>
  )
}

export default TestAutomatedPayout