-- Add slug column to services table for URL-friendly identifiers
ALTER TABLE services
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);

-- Function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, record_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  new_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM services WHERE slug = new_slug AND services.id != record_id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Update existing records with generated slugs
UPDATE services
SET slug = generate_unique_slug(
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(services.name_en, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  ),
  services.id
)
WHERE services.slug IS NULL OR services.slug = '';

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_unique_slug(TEXT, UUID);