# 🚀 แก้ไขปัญหา Production ภายใน 5 นาที

## ปัญหา
Frontend บน production ไม่สามารถจองได้ เพราะไม่มี backend server

## วิธีแก้ (ใช้ Vercel Serverless Functions)

### ✅ สิ่งที่ทำไปแล้ว

1. ✅ สร้าง Vercel Serverless Function: `apps/hotel/api/secure-bookings.ts`
2. ✅ แก้ไข `secureBookingService.ts` ให้ใช้ relative path
3. ✅ ติดตั้ง `@vercel/node`

---

## 📋 ขั้นตอนที่เหลือ (3 ขั้นตอน)

### 1️⃣ เพิ่ม Environment Variable ใน Vercel

1. ไปที่ https://vercel.com/dashboard
2. เลือกโปรเจค **hotel.theblissmassageathome.com**
3. ไปที่ **Settings** > **Environment Variables**
4. เพิ่ม variable ใหม่:

   ```
   Key: SUPABASE_SERVICE_ROLE_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY
   Environment: Production, Preview, Development (เลือกทั้ง 3)
   ```

5. คลิก **Save**

---

### 2️⃣ Commit และ Push Code

```bash
# ใน terminal
cd /Users/baituaykitty/Desktop/MAZ/The\ Bliss\ at\ Home/the-bliss-at-home-1

# Add files
git add apps/hotel/api/secure-bookings.ts
git add apps/hotel/vercel.json
git add apps/hotel/src/services/secureBookingService.ts

# Commit
git commit -m "fix(hotel): add Vercel serverless function for bookings"

# Push to current branch
git push
```

---

### 3️⃣ Merge และ Deploy

**ถ้าอยู่ใน branch `feature/hotels`:**

```bash
# Merge to main
git checkout main
git merge feature/hotels
git push origin main
```

**Vercel จะ auto-deploy ภายใน 2-3 นาที**

---

## ✅ ตรวจสอบว่าแก้ไขสำเร็จ

1. รอให้ Vercel deploy เสร็จ (ดูที่ Dashboard)
2. เปิด https://hotel.theblissmassageathome.com/
3. เปิด Browser Console (F12) > Network tab
4. ลองจองบริการ
5. ✅ **สำเร็จ:** เห็น request ไปที่ `/api/secure-bookings` และได้ response 200
6. ❌ **ยังไม่สำเร็จ:** เห็น 500 error → ตรวจสอบ Vercel Logs

---

## 🔍 Troubleshooting

### ปัญหา: API ยัง 500 error

**แก้ไข:**
1. ไปที่ Vercel Dashboard > **Deployments** > คลิก deployment ล่าสุด
2. ไปที่ **Functions** tab
3. คลิก `/api/secure-bookings` เพื่อดู logs
4. ตรวจสอบ error message

### ปัญหา: Environment variable ไม่ทำงาน

**แก้ไข:**
1. ตรวจสอบว่าใส่ `SUPABASE_SERVICE_ROLE_KEY` ถูกต้อง
2. ต้อง **Redeploy** ใหม่ถึงจะใช้ ENV ใหม่:
   - Vercel Dashboard > **Deployments** > คลิก **...** > **Redeploy**

### ปัญหา: CORS error

**แก้ไข:**
- อยู่ใน code แล้ว (line 32-34 ใน `secure-bookings.ts`)
- ถ้ายังเจอ ให้เพิ่ม domain ของคุณ:
  ```typescript
  response.setHeader('Access-Control-Allow-Origin', 'https://hotel.theblissmassageathome.com')
  ```

---

## 💡 ข้อดีของวิธีนี้

✅ **ไม่ต้อง deploy backend แยก** (ทุกอย่างอยู่บน Vercel)
✅ **Auto-scale** (Vercel จัดการให้)
✅ **ฟรี** (อยู่ใน Vercel free tier)
✅ **ปลอดภัย** (ใช้ service role key ที่ฝั่ง server)
✅ **Deploy ง่าย** (commit แล้ว auto-deploy)

---

## 📞 ยังไม่ได้?

ส่ง screenshot ของ:
1. Browser Console (Network tab)
2. Vercel Function Logs
3. Error message ที่เห็น
