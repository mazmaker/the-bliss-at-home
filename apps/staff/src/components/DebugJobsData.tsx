import { useState, useEffect } from 'react'
import { supabase } from '@bliss/supabase'
import { useAuth } from '@bliss/supabase/auth'

export default function DebugJobsData() {
  const { user } = useAuth()
  const [debugData, setDebugData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkDatabase = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      console.log('🔍 Debug: Starting database investigation...')

      // 1. Check total jobs in database
      const { data: allJobs, error: allJobsError } = await supabase
        .from('jobs')
        .select('id, status, staff_id, customer_name, scheduled_date')
        .limit(10)

      console.log('📊 All jobs (sample):', allJobs)
      console.log('📊 Total jobs found:', allJobs?.length || 0)

      // 2. Check if our staff exists
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, profile_id')
        .eq('profile_id', user.id)
        .single()

      console.log('👤 Current staff data:', staffData)

      // 3. Check all staff in database
      const { data: allStaff, error: allStaffError } = await supabase
        .from('staff')
        .select('id, profile_id')
        .limit(10)

      console.log('👥 All staff (sample):', allStaff)

      // 4. Check if there are jobs with any staff_id
      const { data: jobsWithStaff, error: jobsWithStaffError } = await supabase
        .from('jobs')
        .select('id, status, staff_id, customer_name, scheduled_date')
        .not('staff_id', 'is', null)
        .limit(10)

      console.log('💼 Jobs with staff assigned:', jobsWithStaff)

      // 4.5. Check if there are jobs specifically for this staff
      if (staffData) {
        const { data: jobsForThisStaff, error: jobsForThisStaffError } = await supabase
          .from('jobs')
          .select('id, status, staff_id, customer_name, scheduled_date')
          .eq('staff_id', staffData.id)
          .limit(5)

        console.log('🎯 Jobs specifically for this staff:', jobsForThisStaff)

        // Check the staff_id types and values
        if (jobsWithStaff && jobsWithStaff.length > 0) {
          const firstJob = jobsWithStaff[0]
          console.log('🔍 First job staff_id type:', typeof firstJob.staff_id, 'Value:', firstJob.staff_id)
          console.log('🔍 Current staff ID type:', typeof staffData.id, 'Value:', staffData.id)
          console.log('🔍 Are they equal?', firstJob.staff_id === staffData.id)
          console.log('🔍 String comparison:', String(firstJob.staff_id) === String(staffData.id))
        }
      }

      // 5. Check jobs without staff
      const { data: jobsWithoutStaff, error: jobsWithoutStaffError } = await supabase
        .from('jobs')
        .select('id, status, staff_id, customer_name, scheduled_date')
        .is('staff_id', null)
        .limit(5)

      console.log('🆓 Jobs without staff:', jobsWithoutStaff)

      setDebugData({
        allJobs: allJobs || [],
        staffData,
        allStaff: allStaff || [],
        jobsWithStaff: jobsWithStaff || [],
        jobsWithoutStaff: jobsWithoutStaff || [],
        userId: user.id,
        errors: {
          allJobsError,
          staffError,
          allStaffError,
          jobsWithStaffError,
          jobsWithoutStaffError
        }
      })

    } catch (error) {
      console.error('❌ Debug error:', error)
      setDebugData({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkDatabase()
    }
  }, [user])

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <p>🚫 User not authenticated</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
      <h3 className="font-bold text-blue-800 mb-3">🔍 Database Debug Info</h3>

      <button
        onClick={checkDatabase}
        disabled={isLoading}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Checking...' : 'Check Database'}
      </button>

      {debugData && (
        <div className="space-y-4 text-sm">
          <div>
            <strong>User ID:</strong> {debugData.userId}
          </div>

          {debugData.staffData && (
            <div>
              <strong>Staff ID:</strong> {debugData.staffData.id}
            </div>
          )}

          <div>
            <strong>Total Jobs Found:</strong> {debugData.allJobs?.length || 0}
          </div>

          <div>
            <strong>Jobs With Staff:</strong> {debugData.jobsWithStaff?.length || 0}
          </div>

          <div>
            <strong>Jobs Without Staff:</strong> {debugData.jobsWithoutStaff?.length || 0}
          </div>

          {debugData.allJobs && debugData.allJobs.length > 0 && (
            <div>
              <strong>Sample Jobs:</strong>
              <pre className="bg-white p-2 rounded mt-1 overflow-auto text-xs">
                {JSON.stringify(debugData.allJobs, null, 2)}
              </pre>
            </div>
          )}

          {debugData.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {debugData.error}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-2 bg-white rounded text-xs">
        <strong>Check Console for detailed logs</strong>
      </div>
    </div>
  )
}