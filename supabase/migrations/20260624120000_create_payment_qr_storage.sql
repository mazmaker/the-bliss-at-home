-- Migration: Create Storage Bucket for Manual-QR Payment Images
-- Description: Setup payment-qr bucket (admin-uploaded payment-receiving QR + LINE OA QR)
--              with RLS policies (admin write / public read). Mirrors logos bucket.
-- Version: 20260624120000
-- Feature: manual-QR payment mode (temporary, while Omise approval pending)

-- Create storage bucket for manual-QR payment images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr',
  'payment-qr',
  true,
  2048000, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for payment-qr bucket (admin upload/update/delete, public view)
CREATE POLICY "Admins can upload payment-qr"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-qr' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "payment-qr are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-qr');

CREATE POLICY "Admins can update payment-qr"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-qr' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete payment-qr"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-qr' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
