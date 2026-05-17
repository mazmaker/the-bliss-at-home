#!/bin/bash
# Setup GPS Test Data Script
# จะสร้างข้อมูลทดสอบที่ไม่หายง่าย

echo "🚀 Setting up GPS Test Data..."

# Method 1: ผ่าน Supabase CLI (ถ้ามี connection)
if command -v supabase &> /dev/null; then
    echo "📡 Using Supabase CLI..."
    cd "$(dirname "$0")/.."
    supabase db reset --db-url "$DATABASE_URL" --seed
    echo "✅ Supabase seed completed"
else
    echo "⚠️  Supabase CLI not found"
fi

# Method 2: ผ่าน psql (ถ้ามี)
if [ ! -z "$DATABASE_URL" ]; then
    echo "🗃️  Running seed.sql directly..."
    cd "$(dirname "$0")/.."
    psql "$DATABASE_URL" -f supabase/seed.sql
    echo "✅ Direct SQL seed completed"
else
    echo "⚠️  DATABASE_URL not set"
fi

echo "🎯 Test bookings created:"
echo "   📱 BK20260518-GPS1 → journey-test-001"
echo "   📱 BK20260518-GPS2 → journey-test-002"
echo ""
echo "🧪 Test in Customer App:"
echo "   http://localhost:3011/"
echo ""
echo "✅ Setup complete!"