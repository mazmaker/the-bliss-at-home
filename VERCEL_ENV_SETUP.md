# 🔧 Vercel Environment Variables Setup Guide

## Step-by-Step Instructions

### 1. Hotel App Environment Variables

**Project:** `hotel-the-bliss-at-home-1`
**Domain:** hotel.theblissmassageathome.com

1. Go to: https://vercel.com/your-team/hotel-the-bliss-at-home-1/settings/environment-variables
2. Add these variables:

```
Name: VITE_API_URL
Value: https://the-bliss-at-home-server.vercel.app/api
Environment: Production, Preview, Development

Name: VITE_SUPABASE_URL
Value: https://rbdvlfriqjnwpxmmgisf.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: [Keep existing value]
Environment: Production, Preview, Development
```

---

### 2. Customer App Environment Variables

**Project:** `the-bliss-at-home-1`
**Domain:** theblissmassageathome.com

1. Go to: https://vercel.com/your-team/the-bliss-at-home-1/settings/environment-variables
2. Add these variables:

```
Name: VITE_API_URL
Value: https://the-bliss-at-home-server.vercel.app
Environment: Production, Preview, Development

Name: VITE_SUPABASE_URL
Value: https://rbdvlfriqjnwpxmmgisf.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: [Keep existing value]
Environment: Production, Preview, Development
```

---

### 3. Admin App Environment Variables

**Project:** `admin-the-bliss-at-home-1`
**Domain:** admin.theblissmassageathome.com

1. Go to: https://vercel.com/your-team/admin-the-bliss-at-home-1/settings/environment-variables
2. Add these variables:

```
Name: VITE_API_URL
Value: https://the-bliss-at-home-server.vercel.app/api
Environment: Production, Preview, Development

Name: VITE_SUPABASE_URL
Value: https://rbdvlfriqjnwpxmmgisf.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: [Keep existing value]
Environment: Production, Preview, Development
```

---

### 4. Staff App Environment Variables

**Project:** `staff-the-bliss-at-home-1`
**Domain:** staff.theblissmassageathome.com

1. Go to: https://vercel.com/your-team/staff-the-bliss-at-home-1/settings/environment-variables
2. Add these variables:

```
Name: VITE_SERVER_URL
Value: https://the-bliss-at-home-server.vercel.app
Environment: Production, Preview, Development

Name: VITE_SUPABASE_URL
Value: https://rbdvlfriqjnwpxmmgisf.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: [Keep existing value]
Environment: Production, Preview, Development
```

---

### 5. Backend Server Environment Variables

**Project:** `server-the-bliss-at-home-1`
**Domain:** the-bliss-at-home-server.vercel.app

**Current variables should remain as is - no changes needed**

---

## Redeploy All Apps

After adding environment variables:

### Option A: Redeploy via Vercel Dashboard
For each project:
1. Go to Deployments tab
2. Find latest deployment
3. Click "..." menu → "Redeploy"
4. Wait 2-3 minutes

### Option B: Redeploy via Git Push
```bash
# Create empty commit to trigger redeploy
git commit --allow-empty -m "chore: update environment variables"
git push origin feature/hotels
```

---

## Verification

After redeployment, test each app:

### Hotel App Test:
```
URL: https://hotel.theblissmassageathome.com
Action: Try creating a booking
Expected: ✅ Booking created successfully (no ERR_CONNECTION_REFUSED)
```

### Customer App Test:
```
URL: https://theblissmassageathome.com
Action: Try booking with payment
Expected: ✅ Payment processing works
```

### Admin App Test:
```
URL: https://admin.theblissmassageathome.com
Action: Try managing hotels
Expected: ✅ Hotel management works
```

### Staff App Test:
```
URL: https://staff.theblissmassageathome.com
Action: Try viewing jobs
Expected: ✅ Notification works
```

---

## Local Development

Update your local `.env` files:

### apps/hotel/.env
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://rbdvlfriqjnwpxmmgisf.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### apps/customer/.env
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://rbdvlfriqjnwpxmmgisf.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### apps/admin/.env
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://rbdvlfriqjnwpxmmgisf.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### apps/staff/.env
```env
VITE_SERVER_URL=http://localhost:3000
VITE_SUPABASE_URL=https://rbdvlfriqjnwpxmmgisf.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

---

## Troubleshooting

### Issue: Still getting ERR_CONNECTION_REFUSED

**Solution:**
1. Check environment variables are set correctly in Vercel
2. Redeploy the app
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for actual API URL being used

### Issue: Variables not updating

**Solution:**
1. Make sure you selected all environments (Production, Preview, Development)
2. Redeploy the app (not just refresh)
3. Wait 2-3 minutes for propagation

---

**Status:** Ready to Apply
**Time Required:** 10-15 minutes
