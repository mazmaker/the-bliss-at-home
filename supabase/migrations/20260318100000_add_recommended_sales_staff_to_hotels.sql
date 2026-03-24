-- Migration: Add recommended sales staff field to hotels table
-- Description: Add recommended_sales_staff field to track sales representative for each hotel
-- Version: 20260318100000

-- Add recommended_sales_staff column to hotels table
ALTER TABLE hotels
ADD COLUMN recommended_sales_staff TEXT;

-- Add index for better query performance
CREATE INDEX idx_hotels_recommended_sales_staff ON hotels(recommended_sales_staff);

-- Add comment for documentation
COMMENT ON COLUMN hotels.recommended_sales_staff IS 'Name or ID of recommended sales staff member for this hotel';