// Export utilities for Reports
// Note: This implementation uses browser APIs for simplicity
// For production, consider using proper libraries like jsPDF, SheetJS, etc.

import type {
  DashboardStats,
  ServiceCategoryStats,
  TopService,
  HotelPerformance,
  StaffOverview,
  StaffPerformance,
  StaffEarnings
} from './analyticsQueries'

export interface ReportExportData {
  dashboardStats: DashboardStats | null
  categories: ServiceCategoryStats[]
  topServices: TopService[]
  hotelPerformance: HotelPerformance[]
  staffOverview: StaffOverview | null
  staffPerformance: StaffPerformance[]
  staffEarnings: StaffEarnings[]
  period: string
  generatedAt: string
}

// ============================================
// CSV EXPORT
// ============================================

function arrayToCSV(data: any[]): string {
  if (!data.length) return ''

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')

  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header]
      // Handle values that might contain commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return value
    }).join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}

function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

// ============================================
// EXCEL EXPORT (CSV FORMAT)
// ============================================

export async function exportToExcel(data: ReportExportData): Promise<void> {
  try {
    const { dashboardStats, categories, topServices, hotelPerformance, staffOverview, staffPerformance, staffEarnings, period, generatedAt } = data

    // Create summary sheet
    const summary = [
      ['รายงานสรุป', ''],
      ['ช่วงเวลา', getPeriodName(period)],
      ['สร้างเมื่อ', new Date(generatedAt).toLocaleString('th-TH')],
      ['', ''],
      ['รายได้รวม', dashboardStats?.totalRevenue || 0],
      ['การจองทั้งหมด', dashboardStats?.totalBookings || 0],
      ['ลูกค้าใหม่', dashboardStats?.newCustomers || 0],
      ['ค่าเฉลี่ยต่อการจอง', dashboardStats?.avgBookingValue || 0],
    ]

    // Prepare data for multiple sheets
    const sheets: { name: string; data: any[] }[] = [
      {
        name: 'สรุป',
        data: summary
      }
    ]

    // Add categories sheet
    if (categories.length > 0) {
      const categoriesData = [
        ['หมวดหมู่', 'จำนวนการจอง', 'รายได้', 'เปอร์เซ็นต์'],
        ...categories.map(cat => [cat.category, cat.count, cat.revenue, cat.percentage])
      ]
      sheets.push({ name: 'หมวดหมู่บริการ', data: categoriesData })
    }

    // Add top services sheet
    if (topServices.length > 0) {
      const servicesData = [
        ['อันดับ', 'บริการ', 'การจอง', 'รายได้', 'การเติบโต'],
        ...topServices.map(service => [
          service.rank,
          service.name,
          service.bookings,
          service.revenue,
          service.growth
        ])
      ]
      sheets.push({ name: 'บริการยอดนิยม', data: servicesData })
    }

    // Add hotel performance sheet
    if (hotelPerformance.length > 0) {
      const hotelData = [
        ['โรงแรม', 'การจอง', 'รายได้', 'ค่าคอมมิชชั่น (%)'],
        ...hotelPerformance.map(hotel => [
          hotel.name,
          hotel.bookings,
          hotel.revenue,
          hotel.commission_rate
        ])
      ]
      sheets.push({ name: 'ประสิทธิภาพโรงแรม', data: hotelData })
    }

    // Add staff overview sheet
    if (staffOverview) {
      const staffOverviewData = [
        ['ข้อมูลภาพรวมพนักงาน', ''],
        ['พนักงานทั้งหมด', staffOverview.totalStaff],
        ['พนักงานที่ทำงาน', staffOverview.activeStaff],
        ['พนักงานไม่ทำงาน', staffOverview.inactiveStaff],
        ['รายได้รวมของพนักงาน', staffOverview.totalEarnings],
        ['รายได้เฉลี่ยต่อพนักงาน', staffOverview.avgEarningsPerStaff],
        ['งานที่เสร็จสิ้น', staffOverview.totalBookingsHandled],
        ['คะแนนเฉลี่ย', staffOverview.avgRating]
      ]
      sheets.push({ name: 'ภาพรวมพนักงาน', data: staffOverviewData })
    }

    // Add staff performance sheet
    if (staffPerformance && staffPerformance.length > 0) {
      const performanceData = [
        ['พนักงาน', 'งานเสร็จสิ้น', 'งานยกเลิก', 'รายได้สร้าง', 'รายได้รวม', 'คะแนนเฉลี่ย', 'อัตราเสร็จสิ้น (%)', 'ความตรงต่อเวลา (%)'],
        ...staffPerformance.map(staff => [
          staff.name,
          staff.bookings_completed,
          staff.bookings_cancelled,
          staff.total_revenue_generated,
          staff.total_earnings,
          staff.avg_rating.toFixed(1),
          staff.completion_rate,
          staff.punctuality_score
        ])
      ]
      sheets.push({ name: 'ประสิทธิภาพพนักงาน', data: performanceData })
    }

    // Add staff earnings sheet
    if (staffEarnings && staffEarnings.length > 0) {
      const earningsData = [
        ['พนักงาน', 'รายได้', 'เติบโต (%)'],
        ...staffEarnings.map(staff => [
          staff.name,
          staff.total_earnings,
          staff.earnings_growth.toFixed(1)
        ])
      ]
      sheets.push({ name: 'รายได้พนักงาน', data: earningsData })
    }

    // For simplicity, we'll combine all sheets into one CSV
    // In production, consider using SheetJS to create proper Excel files
    let combinedCSV = ''

    sheets.forEach((sheet, index) => {
      if (index > 0) combinedCSV += '\n\n'
      combinedCSV += `=== ${sheet.name} ===\n`
      combinedCSV += arrayToCSV(
        sheet.data.map(row =>
          Array.isArray(row) ?
            Object.fromEntries(row.map((cell, idx) => [`col${idx}`, cell])) :
            row
        )
      )
    })

    const filename = `รายงาน_${getPeriodName(period)}_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(combinedCSV, filename)

    // Show success message
    console.log('Excel export completed successfully')

  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('ไม่สามารถส่งออกไฟล์ Excel ได้')
  }
}

// ============================================
// PDF EXPORT
// ============================================

export async function exportToPDF(data: ReportExportData): Promise<void> {
  try {
    const { dashboardStats, categories, topServices, hotelPerformance, staffOverview, staffPerformance, staffEarnings, period, generatedAt } = data

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #d97706; margin-bottom: 10px; }
          .subtitle { font-size: 16px; color: #666; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #374151; border-bottom: 2px solid #d97706; padding-bottom: 5px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
          .stat-value { font-size: 24px; font-weight: bold; color: #d97706; }
          .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
          .rank { background: #d97706; color: white; padding: 4px 8px; border-radius: 50%; font-weight: bold; text-align: center; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">รายงานสรุปผลประกอบการ</div>
          <div class="subtitle">The Bliss Massage at Home</div>
          <div class="subtitle">ช่วงเวลา: ${getPeriodName(period)} | สร้างเมื่อ: ${new Date(generatedAt).toLocaleString('th-TH')}</div>
        </div>

        <div class="section">
          <div class="section-title">สรุปภาพรวม</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">฿${(dashboardStats?.totalRevenue || 0).toLocaleString()}</div>
              <div class="stat-label">รายได้รวม</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${(dashboardStats?.totalBookings || 0).toLocaleString()}</div>
              <div class="stat-label">การจองทั้งหมด</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${dashboardStats?.newCustomers || 0}</div>
              <div class="stat-label">ลูกค้าใหม่</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">฿${(dashboardStats?.avgBookingValue || 0).toLocaleString()}</div>
              <div class="stat-label">ค่าเฉลี่ยต่อการจอง</div>
            </div>
          </div>
        </div>

        ${categories.length > 0 ? `
        <div class="section">
          <div class="section-title">การจองตามหมวดหมู่</div>
          <table>
            <thead>
              <tr>
                <th>หมวดหมู่</th>
                <th>จำนวนการจอง</th>
                <th>รายได้</th>
                <th>เปอร์เซ็นต์</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(cat => `
                <tr>
                  <td>${cat.category}</td>
                  <td>${cat.count}</td>
                  <td>฿${cat.revenue.toLocaleString()}</td>
                  <td>${cat.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${topServices.length > 0 ? `
        <div class="section">
          <div class="section-title">บริการยอดนิยม</div>
          <table>
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>บริการ</th>
                <th>การจอง</th>
                <th>รายได้</th>
                <th>การเติบโต</th>
              </tr>
            </thead>
            <tbody>
              ${topServices.map(service => `
                <tr>
                  <td><span class="rank">${service.rank}</span></td>
                  <td>${service.name}</td>
                  <td>${service.bookings}</td>
                  <td>฿${service.revenue.toLocaleString()}</td>
                  <td>${service.growth}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${hotelPerformance.length > 0 ? `
        <div class="section">
          <div class="section-title">ประสิทธิภาพโรงแรม</div>
          <table>
            <thead>
              <tr>
                <th>โรงแรม</th>
                <th>การจอง</th>
                <th>รายได้</th>
                <th>ค่าคอมมิชชั่น</th>
              </tr>
            </thead>
            <tbody>
              ${hotelPerformance.map(hotel => `
                <tr>
                  <td>${hotel.name}</td>
                  <td>${hotel.bookings}</td>
                  <td>฿${hotel.revenue.toLocaleString()}</td>
                  <td>${hotel.commission_rate}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${staffOverview ? `
        <div class="section">
          <div class="section-title">ภาพรวมพนักงาน</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${staffOverview.totalStaff}</div>
              <div class="stat-label">พนักงานทั้งหมด</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${staffOverview.activeStaff}</div>
              <div class="stat-label">พนักงานที่ทำงาน</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">฿${staffOverview.totalEarnings.toLocaleString()}</div>
              <div class="stat-label">รายได้รวมของพนักงาน</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${staffOverview.totalBookingsHandled}</div>
              <div class="stat-label">งานที่เสร็จสิ้น</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${staffPerformance && staffPerformance.length > 0 ? `
        <div class="section">
          <div class="section-title">ประสิทธิภาพพนักงาน (Top 10)</div>
          <table>
            <thead>
              <tr>
                <th>พนักงาน</th>
                <th>งานเสร็จสิ้น</th>
                <th>รายได้รวม</th>
                <th>คะแนนเฉลี่ย</th>
                <th>อัตราเสร็จสิ้น</th>
                <th>ความตรงต่อเวลา</th>
              </tr>
            </thead>
            <tbody>
              ${staffPerformance.slice(0, 10).map(staff => `
                <tr>
                  <td>${staff.name}</td>
                  <td>${staff.bookings_completed}</td>
                  <td>฿${staff.total_earnings.toLocaleString()}</td>
                  <td>${staff.avg_rating.toFixed(1)}⭐</td>
                  <td>${staff.completion_rate}%</td>
                  <td>${staff.punctuality_score.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${staffEarnings && staffEarnings.length > 0 ? `
        <div class="section">
          <div class="section-title">รายได้พนักงาน (Top 10)</div>
          <table>
            <thead>
              <tr>
                <th>พนักงาน</th>
                <th>รายได้</th>
              </tr>
            </thead>
            <tbody>
              ${staffEarnings.slice(0, 10).map(staff => `
                <tr>
                  <td>${staff.name}</td>
                  <td>฿${staff.total_earnings.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>รายงานนี้สร้างขึ้นอัตโนมัติโดยระบบ The Bliss Massage at Home</p>
          <p>สร้างเมื่อ: ${new Date(generatedAt).toLocaleString('th-TH')}</p>
        </div>
      </body>
      </html>
    `

    // Use browser print functionality to save as PDF
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.')
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait a bit for content to load, then print
    setTimeout(() => {
      printWindow.print()
      // Note: The window will remain open for user to save as PDF
    }, 500)

  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('ไม่สามารถส่งออกไฟล์ PDF ได้')
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPeriodName(period: string): string {
  const periodNames = {
    'daily': 'รายวัน',
    'weekly': 'สัปดาห์นี้',
    'month': 'เดือนนี้',
    '3_months': '3 เดือนนี้',
    '6_months': '6 เดือนนี้',
    'year': 'ปีนี้'
  }
  return periodNames[period as keyof typeof periodNames] || period
}

// ============================================
// QUICK EXPORT FUNCTIONS
// ============================================

/**
 * Quick export for current reports data
 */
export async function quickExportPDF(
  dashboardStats: DashboardStats | null,
  categories: ServiceCategoryStats[],
  topServices: TopService[],
  hotelPerformance: HotelPerformance[],
  period: string,
  staffOverview: StaffOverview | null = null,
  staffPerformance: StaffPerformance[] = [],
  staffEarnings: StaffEarnings[] = []
): Promise<void> {
  const data: ReportExportData = {
    dashboardStats,
    categories: categories || [],
    topServices: topServices || [],
    hotelPerformance: hotelPerformance || [],
    staffOverview,
    staffPerformance: staffPerformance || [],
    staffEarnings: staffEarnings || [],
    period,
    generatedAt: new Date().toISOString()
  }

  await exportToPDF(data)
}

/**
 * Quick export for current reports data to Excel
 */
export async function quickExportExcel(
  dashboardStats: DashboardStats | null,
  categories: ServiceCategoryStats[],
  topServices: TopService[],
  hotelPerformance: HotelPerformance[],
  period: string,
  staffOverview: StaffOverview | null = null,
  staffPerformance: StaffPerformance[] = [],
  staffEarnings: StaffEarnings[] = []
): Promise<void> {
  const data: ReportExportData = {
    dashboardStats,
    categories: categories || [],
    topServices: topServices || [],
    hotelPerformance: hotelPerformance || [],
    staffOverview,
    staffPerformance: staffPerformance || [],
    staffEarnings: staffEarnings || [],
    period,
    generatedAt: new Date().toISOString()
  }

  await exportToExcel(data)
}