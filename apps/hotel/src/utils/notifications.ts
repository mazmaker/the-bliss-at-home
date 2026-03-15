import toast from 'react-hot-toast'

/**
 * Utility functions for showing toast notifications
 * สำหรับแสดงการแจ้งเตือนต่างๆ ในรูปแบบ toast
 */

// ประเภทของการแจ้งเตือน
export type NotificationType = 'success' | 'error' | 'loading' | 'info'

// สำเร็จ - การดำเนินการเสร็จสิ้น
export const showSuccess = (message: string) => {
  return toast.success(message, {
    duration: 4000,
    position: 'bottom-right',
  })
}

// ข้อผิดพลาด - การดำเนินการล้มเหลว
export const showError = (message: string) => {
  return toast.error(message, {
    duration: 5000,
    position: 'bottom-right',
  })
}

// กำลังโหลด - การดำเนินการกำลังดำเนินการ
export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'bottom-right',
  })
}

// ข้อมูล - การแจ้งเตือนทั่วไป
export const showInfo = (message: string) => {
  return toast(message, {
    duration: 4000,
    position: 'bottom-right',
    icon: 'ℹ️',
  })
}

// อัปเดต toast ที่มีอยู่ (เช่น เปลี่ยนจาก loading เป็น success/error)
export const updateToast = (
  toastId: string,
  type: 'success' | 'error',
  message: string
) => {
  if (type === 'success') {
    toast.success(message, { id: toastId })
  } else {
    toast.error(message, { id: toastId })
  }
}

// ลบ toast ทั้งหมด
export const dismissAllToasts = () => {
  toast.dismiss()
}

// ลบ toast เฉพาะ
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId)
}

/**
 * Pre-defined notification messages สำหรับ Hotel App
 */
export const notifications = {
  // การจอง (Booking)
  booking: {
    createSuccess: 'สร้างการจองเรียบร้อยแล้ว ✅',
    createError: 'ไม่สามารถสร้างการจองได้ กรุณาลองใหม่อีกครั้ง ❌',
    updateSuccess: 'อัปเดตการจองเรียบร้อยแล้ว ✅',
    updateError: 'ไม่สามารถอัปเดตการจองได้ ❌',
    cancelSuccess: 'ยกเลิกการจองเรียบร้อยแล้ว ✅',
    cancelError: 'ไม่สามารถยกเลิกการจองได้ ❌',
    confirmSuccess: 'ยืนยันการจองเรียบร้อยแล้ว ✅',
    confirmError: 'ไม่สามารถยืนยันการจองได้ ❌',
    createLoading: 'กำลังสร้างการจอง... ⏳',
    updateLoading: 'กำลังอัปเดตการจอง... ⏳',
  },

  // การชำระเงิน (Payment)
  payment: {
    processSuccess: 'ประมวลผลการชำระเงินเรียบร้อยแล้ว ✅',
    processError: 'การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง ❌',
    refundSuccess: 'คืนเงินเรียบร้อยแล้ว ✅',
    refundError: 'ไม่สามารถคืนเงินได้ ❌',
    processLoading: 'กำลังประมวลผลการชำระเงิน... ⏳',
  },

  // ข้อมูลโรงแรม (Hotel Profile)
  profile: {
    updateSuccess: 'อัปเดตข้อมูลโรงแรมเรียบร้อยแล้ว ✅',
    updateError: 'ไม่สามารถอัปเดตข้อมูลโรงแรมได้ ❌',
    uploadSuccess: 'อัปโหลดรูปภาพเรียบร้อยแล้ว ✅',
    uploadError: 'ไม่สามารถอัปโหลดรูปภาพได้ ❌',
    updateLoading: 'กำลังอัปเดตข้อมูล... ⏳',
    uploadLoading: 'กำลังอัปโหลดรูปภาพ... ⏳',
  },

  // การตั้งค่า (Settings)
  settings: {
    updateSuccess: 'อัปเดตการตั้งค่าเรียบร้อยแล้ว ✅',
    updateError: 'ไม่สามารถอัปเดตการตั้งค่าได้ ❌',
    resetSuccess: 'รีเซ็ตการตั้งค่าเรียบร้อยแล้ว ✅',
    resetError: 'ไม่สามารถรีเซ็ตการตั้งค่าได้ ❌',
    updateLoading: 'กำลังอัปเดตการตั้งค่า... ⏳',
  },

  // ระบบทั่วไป (General)
  general: {
    saveSuccess: 'บันทึกข้อมูลเรียบร้อยแล้ว ✅',
    saveError: 'ไม่สามารถบันทึกข้อมูลได้ ❌',
    deleteSuccess: 'ลบข้อมูลเรียบร้อยแล้ว ✅',
    deleteError: 'ไม่สามารถลบข้อมูลได้ ❌',
    loadError: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง ❌',
    networkError: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ต ❌',
    unauthorized: 'ไม่มีสิทธิ์ในการทำรายการนี้ ❌',
    validationError: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง ❌',
    saveLoading: 'กำลังบันทึกข้อมูล... ⏳',
    deleteLoading: 'กำลังลบข้อมูล... ⏳',
  },

  // การส่งออกข้อมูล (Export)
  export: {
    success: 'ส่งออกข้อมูลเรียบร้อยแล้ว ✅',
    error: 'ไม่สามารถส่งออกข้อมูลได้ ❌',
    loading: 'กำลังส่งออกข้อมูล... ⏳',
  },
}

/**
 * Helper functions สำหรับการใช้งานที่ซับซ้อน
 */

// แสดง loading toast และคืนค่า function สำหรับอัปเดต
export const createLoadingToast = (message: string) => {
  const toastId = showLoading(message)

  return {
    success: (successMessage: string) => updateToast(toastId, 'success', successMessage),
    error: (errorMessage: string) => updateToast(toastId, 'error', errorMessage),
    dismiss: () => dismissToast(toastId),
  }
}

// แสดง toast ตามประเภท error
export const showErrorByType = (error: any) => {
  if (!error) {
    showError(notifications.general.saveError)
    return
  }

  if (error.message?.includes('Network')) {
    showError(notifications.general.networkError)
  } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    showError(notifications.general.unauthorized)
  } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    showError(notifications.general.validationError)
  } else {
    showError(error.message || notifications.general.saveError)
  }
}

// แสดง toast แบบ promise (สำหรับ async operations)
export const showPromiseToast = async <T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string
    error: string
  }
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: 'bottom-right',
    }
  )
}