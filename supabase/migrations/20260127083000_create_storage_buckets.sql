-- Migration: Create Storage Buckets for File Uploads
-- Description: Create storage buckets for service images and other files
-- Version: 20260127083000

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================

-- Create bucket for service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,  -- Public access
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for general uploads (avatars, documents, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,  -- Public access
  10485760,  -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy: Allow anyone to view public files
CREATE POLICY "Public read access for service images" ON storage.objects
FOR SELECT USING (bucket_id = 'service-images');

CREATE POLICY "Public read access for uploads" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload service images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'uploads'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update service images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'uploads'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete service images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete uploads" ON storage.objects
FOR DELETE USING (
  bucket_id = 'uploads'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- COMMENTS
-- ============================================

-- COMMENT ON TABLE storage.buckets IS 'File storage buckets for different content types';
-- Note: Comment not added due to permissions

-- ============================================
-- EXAMPLE USAGE
-- ============================================

/*
Bucket Structure:

service-images/
├── massage/
│   ├── thai-massage-1.jpg
│   └── oil-massage-2.png
├── nail/
│   ├── classic-manicure.jpg
│   └── gel-polish.webp
├── spa/
│   └── facial-treatment.jpg
└── facial/
    └── anti-aging.png

uploads/
├── avatars/
│   └── user-avatar-123.jpg
├── documents/
│   └── invoice-456.pdf
└── temp/
    └── temp-upload-789.jpg

File naming convention:
{category}/{service-slug}-{timestamp}.{ext}

Example URLs:
https://your-project.supabase.co/storage/v1/object/public/service-images/massage/thai-massage-1674123456.jpg
https://your-project.supabase.co/storage/v1/object/public/uploads/avatars/user-avatar-1674123456.jpg
*/