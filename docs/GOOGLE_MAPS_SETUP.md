# Google Maps API Setup Guide

## วิธีการขอ Google Maps API Key

### 1. เข้าสู่ Google Cloud Console
- ไปที่ https://console.cloud.google.com/
- เข้าสู่ระบบด้วย Google Account

### 2. สร้าง Project (ถ้ายังไม่มี)
- คลิกที่เมนู "Select a project" ด้านบน
- คลิก "NEW PROJECT"
- ตั้งชื่อ Project เช่น "The Bliss Massage at Home"
- คลิก "Create"

### 3. Enable APIs
ไปที่ https://console.cloud.google.com/google/maps-apis และเปิดใช้งาน APIs ต่อไปนี้:
- **Maps JavaScript API** (สำหรับแสดงแผนที่)
- **Places API** (สำหรับค้นหาสถานที่)

### 4. สร้าง API Key
1. ไปที่ https://console.cloud.google.com/apis/credentials
2. คลิก "+ CREATE CREDENTIALS" > "API Key"
3. คัดลอก API Key ที่ได้

### 5. จำกัดการใช้งาน API Key (Recommended)
เพื่อความปลอดภัย ควรจำกัดการใช้งาน API Key:

1. คลิกที่ API Key ที่สร้างขึ้น
2. ในส่วน "API restrictions":
   - เลือก "Restrict key"
   - เลือก:
     - Maps JavaScript API
     - Places API
3. ในส่วน "Website restrictions" (สำหรับ Production):
   - เลือก "HTTP referrers (web sites)"
   - เพิ่ม domain ของคุณ เช่น:
     - `https://yourdomain.com/*`
     - `http://localhost:*` (สำหรับ Development)
4. คลิก "Save"

### 6. ตั้งค่าใน Project
1. เปิดไฟล์ `apps/admin/.env`
2. แก้ไขบรรทัด:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
   ```
3. แทนที่ `YOUR_ACTUAL_API_KEY_HERE` ด้วย API Key ที่คัดลอกมา
4. Restart dev server

### 7. ทดสอบ
1. เปิด http://localhost:3005/admin/hotels
2. คลิกปุ่ม "เพิ่มโรงแรมใหม่"
3. ในส่วน "ที่ตั้ง" จะเห็นแผนที่ Google Maps
4. ลองคลิกบนแผนที่เพื่อเลือกตำแหน่ง

## คุณสมบัติของ Google Maps Picker

### การใช้งาน
- **คลิกบนแผนที่**: กำหนดตำแหน่งใหม่
- **ลากหมุดสีแดง**: ปรับตำแหน่งอย่างละเอียด
- **ช่องค้นหา**: พิมพ์ชื่อสถานที่เพื่อค้นหาและกำหนดตำแหน่ง
- **ซูมแผนที่**: ใช้ปุ่ม + / - หรือ scroll เมาส์

### การแสดงผล
- แสดง Latitude และ Longitude แบบอัตโนมัติ
- แสดงคำแนะนำการใช้งาน
- รองรับการค้นหาภาษาไทย

## ราคา (Pricing)
Google Maps มี Free Tier ที่ใช้งานได้:
- Maps JavaScript API: $200 credit/เดือน (ประมาณ 28,500 map loads)
- Places API: $200 credit/เดือน (ประมาณ 1,000 requests)

สำหรับการใช้งานทั่วไป น่าจะไม่เกิน Free Tier

## ปัญหาที่พบบ่อย

### แผนที่ไม่แสดง
- ตรวจสอบว่าตั้งค่า API Key ใน `.env` ถูกต้อง
- ตรวจสอบว่า Enable Maps JavaScript API และ Places API แล้ว
- Restart dev server หลังแก้ไข `.env`

### แสดง "This page can't load Google Maps correctly"
- API Key ไม่ถูกต้อง หรือ
- ยังไม่ Enable APIs ที่จำเป็น หรือ
- API Key ถูกจำกัดการใช้งานเกินไป

### Search ไม่ทำงาน
- ตรวจสอบว่า Enable Places API แล้ว
- ตรวจสอบ API restrictions

## การพัฒนาเพิ่มเติม
- เพิ่มการแสดง Autocomplete สำหรับที่อยู่
- เพิ่มการ Geocoding (แปลงที่อยู่เป็นพิกัด)
- แสดงตำแหน่งปัจจุบันของผู้ใช้

## เอกสารอ้างอิง
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Cloud Console](https://console.cloud.google.com/)
