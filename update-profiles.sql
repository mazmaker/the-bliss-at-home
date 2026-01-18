-- Update roles for test users
UPDATE profiles SET role = 'ADMIN', status = 'ACTIVE', full_name = 'Admin User', phone = '+66812345678', language = 'th' WHERE email = 'admin@bliss.test';
UPDATE profiles SET role = 'CUSTOMER', status = 'ACTIVE', full_name = 'Customer User', phone = '+66823456789', language = 'th' WHERE email = 'customer@bliss.test';
UPDATE profiles SET role = 'HOTEL', status = 'ACTIVE', full_name = 'Hotel Manager', phone = '+66834567890', language = 'th' WHERE email = 'hotel@bliss.test';
UPDATE profiles SET role = 'STAFF', status = 'ACTIVE', full_name = 'Staff User', phone = '+66845678901', language = 'th' WHERE email = 'staff@bliss.test';

-- Verify
SELECT email, full_name, role, status FROM profiles WHERE email LIKE '%@bliss.test' ORDER BY role;
