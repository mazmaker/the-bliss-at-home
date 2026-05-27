// Window object extensions for debug functions
interface Window {
  __emergencyGPSReset?: (bookingId?: string) => void
  __debugJobStatus?: () => void
  __resetStuckJob?: () => Promise<void>
}