-- Add receipt_number to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- Add credit_note_number to refund_transactions
ALTER TABLE refund_transactions ADD COLUMN IF NOT EXISTS credit_note_number TEXT UNIQUE;

-- Create receipt sequences table for auto-incrementing document numbers
CREATE TABLE IF NOT EXISTS receipt_sequences (
  prefix TEXT NOT NULL,
  date_key TEXT NOT NULL,
  current_seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, date_key)
);

-- Enable RLS on receipt_sequences
ALTER TABLE receipt_sequences ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on receipt_sequences"
  ON receipt_sequences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to generate document numbers atomically
CREATE OR REPLACE FUNCTION generate_document_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_date_key TEXT;
  v_seq INT;
BEGIN
  v_date_key := TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'YYYYMMDD');

  INSERT INTO receipt_sequences (prefix, date_key, current_seq)
  VALUES (p_prefix, v_date_key, 1)
  ON CONFLICT (prefix, date_key)
  DO UPDATE SET current_seq = receipt_sequences.current_seq + 1
  RETURNING current_seq INTO v_seq;

  RETURN p_prefix || '-' || v_date_key || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Insert company settings mockup data
INSERT INTO settings (id, key, value, description, updated_at)
VALUES
  (gen_random_uuid(), 'company_name_th', '{"value": "บริษัท เดอะบลิส แอท โฮม จำกัด"}'::jsonb, 'Company name in Thai', NOW()),
  (gen_random_uuid(), 'company_tax_id', '{"value": "0123456789012"}'::jsonb, 'Company tax ID / เลขประจำตัวผู้เสียภาษี', NOW())
ON CONFLICT (key) DO NOTHING;
