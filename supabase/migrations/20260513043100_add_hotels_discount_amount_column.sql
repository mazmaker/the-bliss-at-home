-- เพิ่ม column discount_amount ใหม่สำหรับเก็บจำนวนเงินส่วนลด (บาท)
-- ตั้งค่าเริ่มต้นเป็น 0 และให้ Admin กรอกเองภายหลัง
-- โรงแรมสามารถตั้งส่วนลดเป็นจำนวนเงินคงที่แทนเปอร์เซ็นต์

-- Phase 1: เพิ่ม column ใหม่
ALTER TABLE hotels
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- เพิ่ม comment สำหรับ documentation
COMMENT ON COLUMN hotels.discount_amount IS 'จำนวนเงินส่วนลดคงที่ (บาท) ที่โรงแรมให้ลูกค้า - แทนที่การใช้เปอร์เซ็นต์';

-- Index สำหรับ query performance (ถ้าจำเป็น)
CREATE INDEX IF NOT EXISTS idx_hotels_discount_amount ON hotels(discount_amount) WHERE discount_amount > 0;