import { useState, useEffect } from 'react'
import { Activity, MapPin, Clock, Database } from 'lucide-react'

// GPS Debug Panel สำหรับทดสอบการอัพเดต GPS
export default function GPSDebugPanel() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [watchId, setWatchId] = useState<number | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('th-TH')
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const startMonitoring = () => {
    if (!navigator.geolocation) {
      addLog('❌ GPS ไม่รองรับในเบราเซอร์นี้')
      return
    }

    setIsMonitoring(true)
    addLog('🎯 เริ่มติดตาม GPS...')

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos)
        setUpdateCount(prev => prev + 1)
        setLastUpdate(new Date().toLocaleString('th-TH'))
        addLog(`📍 GPS Update: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (±${pos.coords.accuracy?.toFixed(0)}m)`)
      },
      (error) => {
        addLog(`❌ GPS Error: ${error.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    setWatchId(id)
  }

  const stopMonitoring = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setIsMonitoring(false)
    addLog('🛑 หยุดติดตาม GPS')
  }

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  return (
    <div className="bg-white border border-bliss-300 rounded-lg p-4 m-4 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-bliss-600" />
        <h3 className="font-medium text-bliss-900">GPS Debug Panel</h3>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-4">
        {!isMonitoring ? (
          <button
            onClick={startMonitoring}
            className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Start Monitoring
          </button>
        ) : (
          <button
            onClick={stopMonitoring}
            className="bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700"
          >
            Stop Monitoring
          </button>
        )}
        <button
          onClick={() => setLogs([])}
          className="bg-bliss-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-bliss-700"
        >
          Clear Logs
        </button>
      </div>

      {/* Status Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-bliss-500" />
          <span>Updates: {updateCount}</span>
        </div>

        {position && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-bliss-500" />
              <span>
                {position.coords.latitude.toFixed(6)}, {position.coords.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-bliss-500">Accuracy:</span>
              <span>{position.coords.accuracy?.toFixed(0)}m</span>
            </div>
          </>
        )}

        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-bliss-500" />
            <span>Last: {lastUpdate}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-bliss-500" />
          <span>Journey: {localStorage.getItem('current_journey_id') || 'None'}</span>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-bliss-700 mb-2">Activity Log</h4>
        <div className="bg-bliss-50 rounded p-2 max-h-32 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-bliss-500">No activity yet</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-xs font-mono text-bliss-700 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-3 p-2 bg-bliss-50 border border-bliss-200 rounded text-xs">
        <p className="font-medium text-bliss-700">How to test:</p>
        <ul className="text-bliss-600 mt-1 space-y-1">
          <li>• Click "Start Monitoring"</li>
          <li>• Walk around (indoors GPS may be slow)</li>
          <li>• Watch for position updates</li>
          <li>• Updates should appear every few seconds when moving</li>
        </ul>
      </div>
    </div>
  )
}