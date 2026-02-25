-- 🏨 STEP 1: Create Hotel Invitations Table
-- Execute this in Supabase Dashboard > SQL Editor

-- Create hotel_invitations table
CREATE TABLE IF NOT EXISTS hotel_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_hotel_id ON hotel_invitations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_token ON hotel_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_email ON hotel_invitations(email);

-- Enable Row Level Security
ALTER TABLE hotel_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all hotel invitations" ON hotel_invitations;
DROP POLICY IF EXISTS "Hotels can view their own invitations" ON hotel_invitations;

-- Create RLS policies
CREATE POLICY "Admins can manage all hotel invitations" ON hotel_invitations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Hotels can view their own invitations" ON hotel_invitations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HOTEL'
    AND profiles.hotel_id = hotel_invitations.hotel_id
  )
);

-- Verification query
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename = 'hotel_invitations';

-- Success message
SELECT '✅ Hotel invitations table created successfully!' as result;