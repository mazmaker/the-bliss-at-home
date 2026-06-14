-- Migration: Customer health declarations (ข้อควรระวังและข้อมูลสุขภาพก่อนรับบริการ)
-- Date: 2026-06-12
--
-- Customers must declare health conditions (or "none") before booking.
-- Condition keys:
--   heart_disease   โรคหัวใจ
--   blood_pressure  โรคความดันโลหิต (สูง / ต่ำ)
--   diabetes        โรคเบาหวาน
--   pregnancy       อยู่ระหว่างการตั้งครรภ์
--   post_surgery    พักฟื้นจากการผ่าตัด / แผลผ่าตัดยังไม่หายดี
--   skin_disease    โรคผิวหนัง
--   other           อื่น ๆ (ระบุใน other_detail)

CREATE TABLE IF NOT EXISTS customer_health_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conditions text[] NOT NULL DEFAULT '{}',
  other_detail text,
  has_no_condition boolean NOT NULL DEFAULT false,
  -- PDPA: when the customer confirmed the declaration is truthful
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_health_declaration_customer UNIQUE (customer_id),
  -- must either declare "no condition" or at least one condition
  -- (cardinality, not array_length: array_length('{}') is NULL which would pass the CHECK)
  CONSTRAINT chk_health_declaration_not_empty
    CHECK (has_no_condition = true OR cardinality(conditions) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_health_declarations_customer
  ON customer_health_declarations (customer_id);

-- updated_at maintenance
CREATE OR REPLACE FUNCTION set_health_declaration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_health_declaration_updated_at ON customer_health_declarations;
CREATE TRIGGER trg_health_declaration_updated_at
  BEFORE UPDATE ON customer_health_declarations
  FOR EACH ROW
  EXECUTE FUNCTION set_health_declaration_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE customer_health_declarations ENABLE ROW LEVEL SECURITY;

-- Customers manage their own declaration
DROP POLICY IF EXISTS "customers manage own health declaration" ON customer_health_declarations;
CREATE POLICY "customers manage own health declaration"
  ON customer_health_declarations
  FOR ALL
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- Admins read everything
DROP POLICY IF EXISTS "admins read health declarations" ON customer_health_declarations;
CREATE POLICY "admins read health declarations"
  ON customer_health_declarations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Staff can read declarations only for customers of jobs assigned to them
-- (jobs.staff_id and jobs.customer_id both reference profiles.id)
DROP POLICY IF EXISTS "staff read declarations for assigned jobs" ON customer_health_declarations;
CREATE POLICY "staff read declarations for assigned jobs"
  ON customer_health_declarations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM jobs j
      JOIN customers c ON c.profile_id = j.customer_id
      WHERE c.id = customer_health_declarations.customer_id
        AND j.staff_id = auth.uid()
    )
  );
