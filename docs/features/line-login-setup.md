# LINE Login Setup Guide

## Phase 1: LINE Developers Console Setup

### 1.1 Create LINE Login Channel
1. ไปที่ https://developers.line.biz/console/
2. สร้าง Provider ใหม่ (ถ้ายังไม่มี)
3. สร้าง LINE Login channel
4. กรอกข้อมูล:
   - Channel name: "The Bliss at Home"
   - Channel description: "Spa booking platform"
   - App type: Web app

### 1.2 Configure Callback URLs
```
Development:
- http://localhost:3012/auth/callback
- http://localhost:3002/auth/callback

Production:
- https://your-domain.com/auth/callback
- https://the-bliss-customer.vercel.app/auth/callback
```

### 1.3 Get Credentials
- Channel ID: จดเก็บไว้
- Channel secret: จดเก็บไว้ (เก็บเป็นความลับ)

### 1.4 Configure Permissions
- OpenID Connect: ✅ Enable
- Email address: ✅ Enable (ถ้าต้องการ)
- Profile: ✅ Enable

## Phase 2: Supabase Configuration

### 2.1 Add LINE Provider
1. เข้า Supabase Dashboard > Authentication > Providers
2. เปิดใช้ LINE provider
3. กรอก:
   - Channel ID: จาก LINE Developers
   - Channel Secret: จาก LINE Developers
   - Redirect URL: `https://[project-ref].supabase.co/auth/v1/callback`

### 2.2 Update RLS Policies (ถ้าจำเป็น)
```sql
-- Allow LINE users to create profile
CREATE POLICY "Allow LINE users to create profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
```

## Phase 3: Environment Variables

### 3.1 Add to .env
```env
# LINE Login
VITE_LINE_CHANNEL_ID=your_channel_id_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# Supabase (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Security Notes
- ไม่เปิดเผย Channel Secret ในฝั่ง frontend
- ใช้ HTTPS ใน production
- Validate token ในฝั่ง backend