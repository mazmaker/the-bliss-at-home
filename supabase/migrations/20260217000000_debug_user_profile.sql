-- Migration: Debug User Profile (Temporary)
-- Description: Check user profile and role for debugging
-- Version: 20260217000000

-- This migration will be reverted after debugging

DO $$
DECLARE
    user_record RECORD;
    hotel_record RECORD;
BEGIN
    -- Check user profile
    SELECT p.id, p.role, p.first_name, p.last_name, p.email
    INTO user_record
    FROM profiles p
    WHERE p.id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

    IF FOUND THEN
        RAISE NOTICE 'User Profile: ID=%, Role=%, Name=% %',
            user_record.id, user_record.role, user_record.first_name, user_record.last_name;
    ELSE
        RAISE NOTICE 'User profile not found for ID: df59b8ba-52e6-4d4d-b050-6f63d83446e3';
    END IF;

    -- Check hotel association
    SELECT h.id, h.name
    INTO hotel_record
    FROM hotels h
    WHERE h.profile_id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

    IF FOUND THEN
        RAISE NOTICE 'Hotel Association: ID=%, Name=%', hotel_record.id, hotel_record.name;
    ELSE
        RAISE NOTICE 'No hotel association found for this user';
    END IF;
END $$;