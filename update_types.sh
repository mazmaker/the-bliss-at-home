#!/bin/bash
echo "🔄 กำลังอัพเดท TypeScript types..."
supabase gen types --lang=typescript --project-id=rbdvlfriqjnwpxmmgisf > packages/types/database.types.ts
echo "✅ อัพเดท types เสร็จแล้ว!"
echo "🎉 ตอนนี้คุณสามารถแก้ไขโรงแรมและเพิ่มอัตราส่วนลดได้แล้ว!"
