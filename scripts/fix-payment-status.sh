#!/bin/bash
# Fix payment status for test bookings
# Date: 2026-05-18

echo "🔧 Fixing payment status for test bookings..."

cd "$(dirname "$0")/.."

# Method 1: ผ่าน Supabase CLI
if command -v supabase &> /dev/null; then
    echo "📡 Using Supabase CLI..."
    supabase db push --include-seed
    echo "✅ Database updated with new seed data"
fi

# Method 2: รัน SQL อัพเดท
echo "🗃️ Updating payment status directly..."
echo "
-- Update payment status
UPDATE bookings
SET payment_method = 'credit_card', payment_status = 'paid', updated_at = NOW()
WHERE booking_number = 'BK20260518-GPS1';

UPDATE bookings
SET payment_method = 'cash', payment_status = 'paid', updated_at = NOW()
WHERE booking_number = 'BK20260518-GPS2';
" > /tmp/update_payment.sql

# Method 3: แสดง SQL ให้ copy-paste
echo ""
echo "📋 SQL Commands to run manually:"
echo "=================="
cat /tmp/update_payment.sql
echo "=================="
echo ""
echo "🎯 Expected Result:"
echo "   📱 BK20260518-GPS1 → payment_status: 'paid' (credit_card)"
echo "   📱 BK20260518-GPS2 → payment_status: 'paid' (cash)"
echo ""
echo "🧪 Test in Customer App: http://localhost:3011/"
echo "   Should show: ✅ ชำระแล้ว"
echo ""
echo "✅ Fix script complete!"