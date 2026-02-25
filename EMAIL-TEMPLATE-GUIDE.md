# 📧 Hotel Onboarding Email Template Guide

## Overview
Template สำหรับการส่งอีเมลเชิญโรงแรมเข้าร่วมระบบ The Bliss at Home

## 📁 Template Files

### 1. **HOTEL-ONBOARDING-EMAIL.html**
- HTML version พร้อม styling สวยงาม
- รองรับ responsive design
- มี visual elements และ branding

### 2. **HOTEL-ONBOARDING-EMAIL.txt**
- Text version สำหรับ email clients ที่ไม่รองรับ HTML
- รูปแบบ plain text ที่อ่านง่าย

## 🔧 Template Variables

### Hotel Information
| Variable | Description | Example |
|----------|-------------|---------|
| `{{HOTEL_NAME_TH}}` | ชื่อโรงแรมภาษาไทย | โรงแรมฮิลตัน กรุงเทพฯ |
| `{{HOTEL_NAME_EN}}` | ชื่อโรงแรมภาษาอังกฤษ | Hilton Bangkok |
| `{{HOTEL_SLUG}}` | URL slug ของโรงแรม | hilton-bangkok |

### Contact Information
| Variable | Description | Example |
|----------|-------------|---------|
| `{{CONTACT_PERSON}}` | ชื่อผู้ติดต่อ | คุณสมชาย ใจดี |
| `{{CONTACT_EMAIL}}` | อีเมลผู้ติดต่อ | manager@hilton.com |

### Login Credentials
| Variable | Description | Example |
|----------|-------------|---------|
| `{{LOGIN_EMAIL}}` | อีเมลสำหรับเข้าสู่ระบบ | hilton-bangkok@theblissathome.com |
| `{{TEMPORARY_PASSWORD}}` | รหัสผ่านชั่วคราว | HotelHilton2026! |
| `{{LOGIN_URL}}` | URL เข้าสู่ระบบ | https://hotel.theblissathome.com |

### Business Information
| Variable | Description | Example |
|----------|-------------|---------|
| `{{COMMISSION_RATE}}` | อัตราค่าคอมมิชชั่น (%) | 20 |
| `{{DISCOUNT_RATE}}` | อัตราส่วนลด (%) | 15 |

### System Information
| Variable | Description | Example |
|----------|-------------|---------|
| `{{INVITATION_TOKEN}}` | Token สำหรับ accept invitation | abc123def456... |
| `{{EXPIRES_DATE}}` | วันที่หมดอายุของ invitation | 2026-02-27 |

## 🚀 Implementation

### 1. JavaScript Template Engine

```javascript
function generateHotelOnboardingEmail(hotelData, templateType = 'html') {
  // Read template file
  const templatePath = templateType === 'html'
    ? './HOTEL-ONBOARDING-EMAIL.html'
    : './HOTEL-ONBOARDING-EMAIL.txt'

  let template = fs.readFileSync(templatePath, 'utf8')

  // Replace variables
  const variables = {
    HOTEL_NAME_TH: hotelData.name_th,
    HOTEL_NAME_EN: hotelData.name_en,
    HOTEL_SLUG: hotelData.hotel_slug,
    CONTACT_PERSON: hotelData.contact_person,
    CONTACT_EMAIL: hotelData.email,
    LOGIN_EMAIL: `${hotelData.hotel_slug}@theblissathome.com`,
    TEMPORARY_PASSWORD: generatePassword(hotelData.hotel_slug),
    LOGIN_URL: 'https://hotel.theblissathome.com',
    COMMISSION_RATE: hotelData.commission_rate,
    DISCOUNT_RATE: hotelData.discount_rate || 15,
    INVITATION_TOKEN: generateInvitationToken(),
    EXPIRES_DATE: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
  }

  // Replace all template variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    template = template.replace(regex, variables[key])
  })

  return template
}
```

### 2. Email Service Integration

```javascript
import nodemailer from 'nodemailer'

async function sendHotelOnboardingEmail(hotelData) {
  // Generate email content
  const htmlContent = generateHotelOnboardingEmail(hotelData, 'html')
  const textContent = generateHotelOnboardingEmail(hotelData, 'text')

  // Email configuration
  const transporter = nodemailer.createTransporter({
    service: 'gmail', // or your email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  // Send email
  const mailOptions = {
    from: '"The Bliss at Home" <noreply@theblissathome.com>',
    to: hotelData.email,
    subject: `🏨 เชิญเข้าร่วมพาร์ทเนอร์โรงแรม - ${hotelData.name_th}`,
    html: htmlContent,
    text: textContent,
    attachments: [
      {
        filename: 'logo.png',
        path: './assets/logo.png',
        cid: 'logo' // For inline images
      }
    ]
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('❌ Email send failed:', error)
    return { success: false, error: error.message }
  }
}
```

### 3. Database Integration

```javascript
async function onHotelApproval(hotelId) {
  try {
    // Get hotel data
    const { data: hotel } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .single()

    if (!hotel) {
      throw new Error('Hotel not found')
    }

    // Generate credentials
    const credentials = await generateHotelCredentials(
      hotel.name_th,
      hotel.hotel_slug
    )

    // Create invitation record
    const { data: invitation } = await supabase
      .from('hotel_invitations')
      .insert({
        hotel_id: hotelId,
        email: credentials.suggested_email,
        status: 'sent',
        invited_by: req.user?.id
      })
      .select()
      .single()

    // Send onboarding email
    const emailResult = await sendHotelOnboardingEmail({
      ...hotel,
      ...credentials,
      invitation_token: invitation.invitation_token
    })

    if (emailResult.success) {
      // Update invitation status
      await supabase
        .from('hotel_invitations')
        .update({ status: 'sent' })
        .eq('id', invitation.id)

      console.log('✅ Hotel onboarding email sent successfully')
      return { success: true }
    } else {
      throw new Error('Failed to send email: ' + emailResult.error)
    }

  } catch (error) {
    console.error('❌ Hotel onboarding failed:', error)
    return { success: false, error: error.message }
  }
}
```

## 📋 Email Content Checklist

### ✅ Required Elements
- [ ] Welcome message with hotel name
- [ ] Login credentials (email + password)
- [ ] Step-by-step onboarding instructions
- [ ] Feature list and benefits
- [ ] Commission information
- [ ] Support contact information
- [ ] Security notice (password change required)
- [ ] Expiration information
- [ ] Branding and styling

### ✅ Security Considerations
- [ ] Temporary password generated securely
- [ ] Invitation token for verification
- [ ] Expiration date (7 days)
- [ ] Instructions for password change
- [ ] Contact info for suspicious activity

### ✅ User Experience
- [ ] Clear call-to-action buttons
- [ ] Mobile-responsive design
- [ ] Professional branding
- [ ] Easy-to-find important information
- [ ] Support contact prominently displayed

## 🧪 Testing

### Test Email Generation
```javascript
// Test with sample data
const testHotel = {
  id: 'test-id',
  name_th: 'โรงแรมทดสอบ',
  name_en: 'Test Hotel',
  hotel_slug: 'test-hotel',
  contact_person: 'คุณทดสอบ',
  email: 'test@hotel.com',
  commission_rate: 20,
  discount_rate: 15
}

const htmlEmail = generateHotelOnboardingEmail(testHotel, 'html')
console.log(htmlEmail)
```

### Preview Email
1. Save generated HTML to temp file
2. Open in browser to preview
3. Test on different devices/email clients
4. Verify all links work correctly

## 📧 Production Deployment

### Environment Variables
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@theblissathome.com
EMAIL_PASS=your_email_password
EMAIL_FROM_NAME=The Bliss at Home
LOGIN_URL=https://hotel.theblissathome.com
SUPPORT_EMAIL=support@theblissathome.com
SUPPORT_PHONE=02-123-4567
```

### Email Service Setup
1. Configure email service (Gmail, SendGrid, etc.)
2. Set up domain authentication (SPF, DKIM)
3. Create email templates directory
4. Test email delivery in staging
5. Monitor email delivery rates
6. Set up bounce/complaint handling

---

## 🎯 Usage Examples

### Automatic Email on Hotel Approval
```javascript
// In hotel approval endpoint
router.post('/hotels/:id/approve', async (req, res) => {
  try {
    // Update hotel status
    await updateHotelStatus(req.params.id, 'active')

    // Send onboarding email (triggered by database trigger)
    const result = await onHotelApproval(req.params.id)

    if (result.success) {
      res.json({
        success: true,
        message: 'Hotel approved and onboarding email sent'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Hotel approved but email failed: ' + result.error
      })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
```

### Manual Email Resend
```javascript
// In admin panel
router.post('/hotels/:id/resend-invitation', async (req, res) => {
  const result = await onHotelApproval(req.params.id)
  res.json(result)
})
```

---
**Created:** 2026-02-19
**Template Version:** 1.0
**Status:** Production Ready 🚀