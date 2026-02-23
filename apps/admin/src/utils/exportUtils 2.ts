// Export utilities for CSV, Excel, and PDF generation

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(data: any[], filename: string, headers?: string[]) {
  if (data.length === 0) {
    alert('ไม่มีข้อมูลสำหรับการ Export')
    return
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    csvHeaders.join(','), // Header row
    ...data.map(row =>
      csvHeaders.map(header => {
        const value = row[header] ?? ''
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""')
        return escaped.includes(',') ? `"${escaped}"` : escaped
      }).join(',')
    )
  ].join('\n')

  // Add BOM for UTF-8 encoding (for Excel to display Thai characters correctly)
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadFile(blob, `${filename}.csv`)
}

/**
 * Convert data to Excel format and trigger download
 * Note: This creates a simple HTML table that Excel can open
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (data.length === 0) {
    alert('ไม่มีข้อมูลสำหรับการ Export')
    return
  }

  const headers = Object.keys(data[0])

  // Create HTML table
  const htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #4472C4; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row =>
              `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  downloadFile(blob, `${filename}.xls`)
}

/**
 * Generate PDF from data and trigger download
 * Note: This creates a simple HTML document that can be printed to PDF
 */
export function exportToPDF(data: any[], filename: string, title: string = 'รายงาน') {
  if (data.length === 0) {
    alert('ไม่มีข้อมูลสำหรับการ Export')
    return
  }

  const headers = Object.keys(data[0])

  // Create HTML for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 12px; }
          h1 { text-align: center; color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4472C4; color: white; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row =>
              `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>สร้างโดยระบบ The Bliss Massage at Home - Hotel Management System</p>
        </div>
      </body>
    </html>
  `

  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()

    // Wait for content to load then trigger print dialog
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Format invoice data for export
 */
export function formatInvoicesForExport(invoices: any[]) {
  return invoices.map(inv => ({
    'เลขที่บิล': inv.invoice_number,
    'ช่วงเวลา': `${inv.period_start} - ${inv.period_end}`,
    'ประเภท': inv.period_type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน',
    'จำนวนการจอง': inv.total_bookings,
    'รายได้': `฿${inv.total_revenue.toLocaleString()}`,
    'คอมมิชชั่น': `฿${inv.commission_amount.toLocaleString()} (${inv.commission_rate}%)`,
    'สถานะ': getStatusLabel(inv.status),
    'วันที่ออก': inv.issued_date,
    'วันครบกำหนด': inv.due_date,
    'วันที่จ่าย': inv.paid_date || '-'
  }))
}

/**
 * Format payment data for export
 */
export function formatPaymentsForExport(payments: any[]) {
  return payments.map(payment => ({
    'รหัสธุรกรรม': payment.transaction_id,
    'เลขที่บิล': payment.invoice_number,
    'จำนวนเงิน': `฿${payment.amount.toLocaleString()}`,
    'วิธีการชำระ': getPaymentMethodLabel(payment.payment_method),
    'สถานะ': getPaymentStatusLabel(payment.status),
    'วันที่ชำระ': payment.payment_date,
    'ยืนยันโดย': payment.verified_by || '-',
    'วันที่ยืนยัน': payment.verified_date || '-',
    'หมายเหตุ': payment.notes || '-'
  }))
}

/**
 * Format booking data for export
 */
export function formatBookingsForExport(bookings: any[]) {
  return bookings.map(booking => ({
    'เลขที่การจอง': booking.booking_number,
    'ชื่อผู้เข้าพัก': booking.customer_name,
    'เบอร์โทร': booking.customer_phone,
    'อีเมล': booking.customer_email || '-',
    'ห้องพัก': booking.room_number || '-',
    'วันเช็คอิน': booking.check_in_date,
    'วันเช็คเอาท์': booking.check_out_date,
    'บริการเพิ่มเติม': booking.additional_services || '-',
    'ราคา': `฿${booking.price.toLocaleString()}`,
    'สถานะการชำระ': booking.payment_status === 'paid' ? 'จ่ายแล้ว' : 'ยังไม่จ่าย',
    'สถานะ': getBookingStatusLabel(booking.status),
    'สร้างโดยโรงแรม': booking.created_by_hotel ? 'ใช่' : 'ไม่',
    'หมายเหตุ': booking.notes || '-'
  }))
}

// Helper functions for status labels
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'ร่าง',
    pending: 'รอชำระ',
    paid: 'จ่ายแล้ว',
    overdue: 'เกินกำหนด',
    cancelled: 'ยกเลิก'
  }
  return labels[status] || status
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: 'โอนเงิน',
    cash: 'เงินสด',
    cheque: 'เช็ค',
    online: 'ออนไลน์'
  }
  return labels[method] || method
}

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'สำเร็จ',
    pending: 'รอดำเนินการ',
    failed: 'ล้มเหลว',
    refunded: 'คืนเงิน'
  }
  return labels[status] || status
}

function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'ยืนยันแล้ว',
    pending: 'รอยืนยัน',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    no_show: 'ไม่มาใช้บริการ'
  }
  return labels[status] || status
}
