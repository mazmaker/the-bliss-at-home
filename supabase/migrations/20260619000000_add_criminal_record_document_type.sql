-- 2026-06-19: Add 'criminal_record' (ใบตรวจสอบประวัติอาชญากรรม) to staff_documents.document_type.
-- Feature: staff must upload AND admin must verify BOTH criminal_record and license
-- (ใบประกอบวิชาชีพ) before they can accept jobs (enforced app-side in canStaffStartWork +
-- jobService.acceptJob + server dispatch helper; this migration only widens the allowed set).
--
-- The LIVE column is TEXT + CHECK (the ENUM in packages/supabase/migrations/20250205_* is stale
-- drift and is NOT the source of truth). Additive + idempotent. 'license' was already allowed.

ALTER TABLE public.staff_documents
  DROP CONSTRAINT IF EXISTS staff_documents_document_type_check;

ALTER TABLE public.staff_documents
  ADD CONSTRAINT staff_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'id_card'::text,
    'house_registration'::text,
    'license'::text,
    'certificate'::text,
    'bank_statement'::text,
    'criminal_record'::text,
    'other'::text
  ]));
