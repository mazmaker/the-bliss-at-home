import supabase from '@/lib/supabase'

// Types for comprehensive report data
interface ComprehensiveReportData {
  summary: {
    reportDate: string
    period: string
    totalRevenue: number
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    avgBookingValue: number
    completionRate: number
  }
  bookings: Array<{
    booking_number: string
    date: string
    time: string
    service_name: string
    customer_name: string
    staff_name: string
    hotel_name?: string
    status: string
    final_price: number
    duration: number
  }>
  services: Array<{
    name: string
    total_bookings: number
    total_revenue: number
    avg_rating: number
    completion_rate: number
  }>
  staff: Array<{
    name: string
    total_bookings: number
    total_earnings: number
    avg_rating: number
    completion_rate: number
  }>
  customers: Array<{
    name: string
    phone: string
    total_bookings: number
    total_spent: number
    first_booking: string
    last_booking: string
    customer_type: 'new' | 'returning'
  }>
  financial: {
    revenue_breakdown: Array<{
      category: string
      amount: number
      percentage: number
    }>
    monthly_trend: Array<{
      month: string
      revenue: number
      bookings: number
    }>
  }
}

// Function to fetch all comprehensive data
export async function fetchComprehensiveReportData(
  days: number = 30
): Promise<ComprehensiveReportData> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // Fetch bookings with related data
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        booking_number,
        booking_date,
        booking_time,
        status,
        final_price,
        duration,
        created_at,
        services(name_th, name_en),
        customers(full_name, phone),
        staff(name_th, name_en),
        hotels(name_th)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (bookingsError) throw bookingsError

    // Fetch services performance
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        name_th,
        name_en,
        category,
        base_price,
        is_active
      `)
      .eq('is_active', true)

    if (servicesError) throw servicesError

    // Fetch staff performance
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        name_th,
        name_en,
        rating,
        total_earnings,
        status
      `)
      .eq('status', 'active')

    if (staffError) throw staffError

    // Process the data
    const processedData = processReportData(bookingsData || [], servicesData || [], staffData || [], days)
    return processedData

  } catch (error) {
    console.error('Error fetching comprehensive report data:', error)
    throw error
  }
}

// Function to process and organize the data
function processReportData(
  bookings: any[],
  services: any[],
  staff: any[],
  days: number
): ComprehensiveReportData {
  const today = new Date()
  const period = days <= 7 ? 'รายสัปดาห์' : days <= 30 ? 'รายเดือน' : days <= 90 ? '3 เดือน' : '6 เดือน'

  // Calculate summary statistics
  const completedBookings = bookings.filter(b => b.status === 'completed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.final_price || 0), 0)
  const avgBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0
  const completionRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0

  // Process bookings data
  const processedBookings = bookings.map(booking => ({
    booking_number: booking.booking_number || 'N/A',
    date: booking.booking_date || new Date(booking.created_at).toLocaleDateString('th-TH'),
    time: booking.booking_time || 'N/A',
    service_name: booking.services?.name_th || 'ไม่ระบุ',
    customer_name: booking.customers?.full_name || 'ไม่ระบุ',
    staff_name: booking.staff?.name_th || 'ยังไม่มอบหมาย',
    hotel_name: booking.hotels?.name_th || undefined,
    status: translateStatus(booking.status),
    final_price: booking.final_price || 0,
    duration: booking.duration || 0
  }))

  // Process services data
  const serviceMap = new Map()
  bookings.forEach(booking => {
    const serviceName = booking.services?.name_th || 'ไม่ระบุ'
    if (!serviceMap.has(serviceName)) {
      serviceMap.set(serviceName, {
        total_bookings: 0,
        total_revenue: 0,
        completed_count: 0
      })
    }
    const service = serviceMap.get(serviceName)
    service.total_bookings += 1
    if (booking.status === 'completed') {
      service.total_revenue += booking.final_price || 0
      service.completed_count += 1
    }
  })

  const processedServices = Array.from(serviceMap.entries()).map(([name, data]) => ({
    name,
    total_bookings: data.total_bookings,
    total_revenue: data.total_revenue,
    avg_rating: 4.5, // Default rating - you can calculate this from reviews
    completion_rate: data.total_bookings > 0 ? (data.completed_count / data.total_bookings) * 100 : 0
  }))

  // Process staff data
  const staffMap = new Map()
  bookings.forEach(booking => {
    if (booking.staff) {
      const staffName = booking.staff.name_th
      if (!staffMap.has(staffName)) {
        staffMap.set(staffName, {
          total_bookings: 0,
          total_earnings: 0,
          completed_count: 0
        })
      }
      const staffInfo = staffMap.get(staffName)
      staffInfo.total_bookings += 1
      if (booking.status === 'completed') {
        staffInfo.total_earnings += (booking.final_price || 0) * 0.8 // 80% commission
        staffInfo.completed_count += 1
      }
    }
  })

  const processedStaff = Array.from(staffMap.entries()).map(([name, data]) => ({
    name,
    total_bookings: data.total_bookings,
    total_earnings: data.total_earnings,
    avg_rating: 4.5, // Default - can be calculated from reviews
    completion_rate: data.total_bookings > 0 ? (data.completed_count / data.total_bookings) * 100 : 0
  }))

  // Process customers data
  const customerMap = new Map()
  bookings.forEach(booking => {
    if (booking.customers) {
      const customerName = booking.customers.full_name
      const customerPhone = booking.customers.phone || 'ไม่ระบุ'

      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, {
          phone: customerPhone,
          bookings: [],
          total_spent: 0
        })
      }

      const customer = customerMap.get(customerName)
      customer.bookings.push(booking)
      if (booking.status === 'completed') {
        customer.total_spent += booking.final_price || 0
      }
    }
  })

  const processedCustomers = Array.from(customerMap.entries()).map(([name, data]) => {
    const sortedBookings = data.bookings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const firstBooking = sortedBookings[0]
    const lastBooking = sortedBookings[sortedBookings.length - 1]

    return {
      name,
      phone: data.phone,
      total_bookings: data.bookings.length,
      total_spent: data.total_spent,
      first_booking: firstBooking ? new Date(firstBooking.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ',
      last_booking: lastBooking ? new Date(lastBooking.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ',
      customer_type: data.bookings.length > 1 ? 'returning' as const : 'new' as const
    }
  })

  // Generate revenue breakdown
  const revenueBreakdown = processedServices
    .filter(s => s.total_revenue > 0)
    .map(service => ({
      category: service.name,
      amount: service.total_revenue,
      percentage: totalRevenue > 0 ? (service.total_revenue / totalRevenue) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)

  // Generate monthly trend (simplified)
  const monthlyTrend = Array.from({ length: Math.min(6, Math.ceil(days / 30)) }, (_, i) => {
    const monthBookings = bookings.filter(b => {
      const bookingDate = new Date(b.created_at)
      const targetMonth = new Date()
      targetMonth.setMonth(targetMonth.getMonth() - i)
      return bookingDate.getMonth() === targetMonth.getMonth() &&
             bookingDate.getFullYear() === targetMonth.getFullYear()
    })

    const monthRevenue = monthBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.final_price || 0), 0)

    const monthName = new Date()
    monthName.setMonth(monthName.getMonth() - i)

    return {
      month: monthName.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }),
      revenue: monthRevenue,
      bookings: monthBookings.length
    }
  }).reverse()

  return {
    summary: {
      reportDate: today.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      period,
      totalRevenue,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      avgBookingValue,
      completionRate
    },
    bookings: processedBookings,
    services: processedServices.sort((a, b) => b.total_revenue - a.total_revenue),
    staff: processedStaff.sort((a, b) => b.total_earnings - a.total_earnings),
    customers: processedCustomers.sort((a, b) => b.total_spent - a.total_spent),
    financial: {
      revenue_breakdown: revenueBreakdown,
      monthly_trend: monthlyTrend
    }
  }
}

// Function to translate booking status to Thai
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'รอดำเนินการ',
    'confirmed': 'ยืนยันแล้ว',
    'in_progress': 'กำลังให้บริการ',
    'completed': 'เสร็จสิ้น',
    'cancelled': 'ยกเลิก'
  }
  return statusMap[status] || status
}

// Export to Excel function
export async function exportComprehensiveExcel(days: number = 30): Promise<void> {
  try {
    const data = await fetchComprehensiveReportData(days)

    // Create workbook data
    const workbook = {
      sheets: [
        {
          name: 'สรุปรายงาน',
          data: [
            ['รายงานผลการดำเนินงาน - The Bliss Massage at Home'],
            ['วันที่สร้างรายงาน:', data.summary.reportDate],
            ['ช่วงเวลา:', data.summary.period],
            [''],
            ['สรุปยอดรวม'],
            ['รายได้รวม (บาท):', data.summary.totalRevenue.toLocaleString()],
            ['จำนวนการจองทั้งหมด:', data.summary.totalBookings.toLocaleString()],
            ['การจองที่เสร็จสิ้น:', data.summary.completedBookings.toLocaleString()],
            ['การจองที่ยกเลิก:', data.summary.cancelledBookings.toLocaleString()],
            ['ค่าเฉลี่ยต่อการจอง (บาท):', data.summary.avgBookingValue.toLocaleString()],
            ['อัตราการเสร็จสิ้น (%):', data.summary.completionRate.toFixed(2)]
          ]
        },
        {
          name: 'รายละเอียดการจอง',
          data: [
            ['เลขที่จอง', 'วันที่', 'เวลา', 'บริการ', 'ลูกค้า', 'พนักงาน', 'โรงแรม', 'สถานะ', 'ราคา', 'ระยะเวลา (นาที)'],
            ...data.bookings.map(booking => [
              booking.booking_number,
              booking.date,
              booking.time,
              booking.service_name,
              booking.customer_name,
              booking.staff_name,
              booking.hotel_name || '',
              booking.status,
              booking.final_price,
              booking.duration
            ])
          ]
        },
        {
          name: 'ผลการดำเนินงานบริการ',
          data: [
            ['ชื่อบริการ', 'จำนวนการจอง', 'รายได้ (บาท)', 'คะแนนเฉลี่ย', 'อัตราเสร็จสิ้น (%)'],
            ...data.services.map(service => [
              service.name,
              service.total_bookings,
              service.total_revenue.toLocaleString(),
              service.avg_rating.toFixed(1),
              service.completion_rate.toFixed(1)
            ])
          ]
        },
        {
          name: 'ผลการดำเนินงานพนักงาน',
          data: [
            ['ชื่อพนักงาน', 'จำนวนการจอง', 'รายได้ (บาท)', 'คะแนนเฉลี่ย', 'อัตราเสร็จสิ้น (%)'],
            ...data.staff.map(staff => [
              staff.name,
              staff.total_bookings,
              staff.total_earnings.toLocaleString(),
              staff.avg_rating.toFixed(1),
              staff.completion_rate.toFixed(1)
            ])
          ]
        },
        {
          name: 'ข้อมูลลูกค้า',
          data: [
            ['ชื่อลูกค้า', 'เบอร์โทร', 'จำนวนการจอง', 'ยอดใช้จ่าย (บาท)', 'การจองแรก', 'การจองล่าสุด', 'ประเภทลูกค้า'],
            ...data.customers.map(customer => [
              customer.name,
              customer.phone,
              customer.total_bookings,
              customer.total_spent.toLocaleString(),
              customer.first_booking,
              customer.last_booking,
              customer.customer_type === 'returning' ? 'ลูกค้าเก่า' : 'ลูกค้าใหม่'
            ])
          ]
        }
      ]
    }

    // For now, create a simple CSV-like format
    // In a real implementation, you'd use a library like xlsx or similar
    console.log('Excel export data prepared:', workbook)

    // Create CSV content for download
    let csvContent = ''
    workbook.sheets.forEach(sheet => {
      csvContent += `${sheet.name}\n`
      sheet.data.forEach(row => {
        csvContent += row.join(',') + '\n'
      })
      csvContent += '\n'
    })

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `รายงานธุรกิจ_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('Comprehensive Excel export completed successfully')

  } catch (error) {
    console.error('Error exporting comprehensive Excel:', error)
    throw error
  }
}

// Export to PDF function (simplified)
export async function exportComprehensivePDF(days: number = 30): Promise<void> {
  try {
    const data = await fetchComprehensiveReportData(days)

    // Create HTML content for print-to-PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานผลการดำเนินงาน - The Bliss Massage at Home</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Sarabun', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 14px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #d97706; padding-bottom: 15px; }
          .title { font-size: 22px; font-weight: bold; color: #d97706; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .section { margin: 25px 0; page-break-inside: avoid; }
          .section-title { font-size: 16px; font-weight: bold; color: #374151; border-bottom: 2px solid #d97706; padding-bottom: 5px; margin-bottom: 12px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 15px 0; }
          .stat-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; text-align: center; }
          .stat-value { font-size: 20px; font-weight: bold; color: #d97706; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
          th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
          .rank { display: inline-block; background: #d97706; color: white; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; font-weight: bold; font-size: 12px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">รายงานผลการดำเนินงาน</div>
          <div class="subtitle">The Bliss Massage at Home</div>
          <div class="subtitle">ช่วงเวลา: ${data.summary.period} | วันที่: ${data.summary.reportDate}</div>
        </div>

        <div class="section">
          <div class="section-title">สรุปภาพรวม</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">฿${data.summary.totalRevenue.toLocaleString()}</div>
              <div class="stat-label">รายได้รวม</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.summary.totalBookings.toLocaleString()}</div>
              <div class="stat-label">การจองทั้งหมด</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.summary.completedBookings.toLocaleString()}</div>
              <div class="stat-label">เสร็จสิ้น</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.summary.cancelledBookings.toLocaleString()}</div>
              <div class="stat-label">ยกเลิก</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">฿${data.summary.avgBookingValue.toLocaleString()}</div>
              <div class="stat-label">ค่าเฉลี่ย/ครั้ง</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.summary.completionRate.toFixed(1)}%</div>
              <div class="stat-label">อัตราสำเร็จ</div>
            </div>
          </div>
        </div>

        ${data.services.length > 0 ? `
        <div class="section">
          <div class="section-title">บริการยอดนิยม (Top 5)</div>
          <table>
            <thead><tr><th>อันดับ</th><th>บริการ</th><th>การจอง</th><th>รายได้</th></tr></thead>
            <tbody>
              ${data.services.slice(0, 5).map((service, index) => `
                <tr>
                  <td><span class="rank">${index + 1}</span></td>
                  <td>${service.name}</td>
                  <td>${service.total_bookings}</td>
                  <td>฿${service.total_revenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.staff.length > 0 ? `
        <div class="section">
          <div class="section-title">พนักงานยอดเยี่ยม (Top 5)</div>
          <table>
            <thead><tr><th>อันดับ</th><th>พนักงาน</th><th>การจอง</th><th>รายได้</th></tr></thead>
            <tbody>
              ${data.staff.slice(0, 5).map((staff, index) => `
                <tr>
                  <td><span class="rank">${index + 1}</span></td>
                  <td>${staff.name}</td>
                  <td>${staff.total_bookings}</td>
                  <td>฿${staff.total_earnings.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.customers.length > 0 ? `
        <div class="section">
          <div class="section-title">ลูกค้า VIP (Top 10)</div>
          <table>
            <thead><tr><th>อันดับ</th><th>ลูกค้า</th><th>การจอง</th><th>ยอดใช้จ่าย</th></tr></thead>
            <tbody>
              ${data.customers.slice(0, 10).map((customer, index) => `
                <tr>
                  <td><span class="rank">${index + 1}</span></td>
                  <td>${customer.name}</td>
                  <td>${customer.total_bookings}</td>
                  <td>฿${customer.total_spent.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.financial.revenue_breakdown.length > 0 ? `
        <div class="section">
          <div class="section-title">รายได้ตามหมวดบริการ</div>
          <table>
            <thead><tr><th>หมวดหมู่</th><th>รายได้</th><th>สัดส่วน</th></tr></thead>
            <tbody>
              ${data.financial.revenue_breakdown.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>฿${item.amount.toLocaleString()}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.financial.monthly_trend.length > 0 ? `
        <div class="section">
          <div class="section-title">แนวโน้มรายได้รายเดือน</div>
          <table>
            <thead><tr><th>เดือน</th><th>รายได้</th><th>การจอง</th></tr></thead>
            <tbody>
              ${data.financial.monthly_trend.map(month => `
                <tr>
                  <td>${month.month}</td>
                  <td>฿${month.revenue.toLocaleString()}</td>
                  <td>${month.bookings}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>รายงานนี้สร้างขึ้นอัตโนมัติโดยระบบ The Bliss Massage at Home</p>
          <p>วันที่: ${data.summary.reportDate}</p>
        </div>
      </body>
      </html>
    `

    // Use browser print dialog to save as PDF
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site. • กรุณาอนุญาต Popup สำหรับเว็บไซต์นี้')
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait for content to render, then trigger print dialog
    setTimeout(() => {
      printWindow.print()
    }, 500)

    console.log('Comprehensive PDF export completed successfully')

  } catch (error) {
    console.error('Error exporting comprehensive PDF:', error)
    throw error
  }
}