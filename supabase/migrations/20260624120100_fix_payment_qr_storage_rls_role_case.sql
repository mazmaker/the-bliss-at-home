-- Migration: Fix payment-qr storage RLS role-case mismatch
-- Description: profiles.role is stored as 'ADMIN' (uppercase) but the create migration
--              compared to 'admin' (lowercase), so admin uploads to payment-qr got 403
--              (the same latent bug that made the original logos admin-role policy fail —
--              which is why logos fell back to an authenticated-only upload policy).
--              Use a case-insensitive check so writes stay admin-only.
-- Version: 20260624120100

DROP POLICY IF EXISTS "Admins can upload payment-qr" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update payment-qr" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment-qr" ON storage.objects;

CREATE POLICY "Admins can upload payment-qr"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-qr' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'admin'
  )
);

CREATE POLICY "Admins can update payment-qr"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-qr' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND LOWER(profiles.role) = 'admin'
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
    AND LOWER(profiles.role) = 'admin'
  )
);
