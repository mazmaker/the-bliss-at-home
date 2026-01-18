#!/bin/bash

SUPABASE_URL="https://rbdvlfriqjnwpxmmgisf.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY"

echo "🚀 Creating test users..."

# Function to create user
create_user() {
  local email=$1
  local password=$2
  local full_name=$3
  local role=$4
  local phone=$5
  
  curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SERVICE_KEY}" \
    -d '{
      "email": "'"$email"'",
      "password": "'"$password"'",
      "email_confirm": true,
      "user_metadata": {
        "full_name": "'"$full_name"'",
        "role": "'"$role"'"
      }
    }'
  echo ""
}

# Create users
echo "Creating admin user..."
create_user "admin@bliss.test" "Admin123!" "Admin User" "ADMIN" "+66812345678"

echo "Creating customer user..."
create_user "customer@bliss.test" "Customer123!" "Customer User" "CUSTOMER" "+66823456789"

echo "Creating hotel user..."
create_user "hotel@bliss.test" "Hotel123!" "Hotel Manager" "HOTEL" "+66834567890"

echo "Creating staff user..."
create_user "staff@bliss.test" "Staff123!" "Staff User" "STAFF" "+66845678901"

echo ""
echo "✅ Users created! Now run this SQL in Supabase SQL Editor to set roles:"
echo ""
echo "UPDATE profiles SET role = 'ADMIN', status = 'ACTIVE', full_name = 'Admin User', phone = '+66812345678', language = 'th' WHERE email = 'admin@bliss.test';"
echo "UPDATE profiles SET role = 'CUSTOMER', status = 'ACTIVE', full_name = 'Customer User', phone = '+66823456789', language = 'th' WHERE email = 'customer@bliss.test';"
echo "UPDATE profiles SET role = 'HOTEL', status = 'ACTIVE', full_name = 'Hotel Manager', phone = '+66834567890', language = 'th' WHERE email = 'hotel@bliss.test';"
echo "UPDATE profiles SET role = 'STAFF', status = 'ACTIVE', full_name = 'Staff User', phone = '+66845678901', language = 'th' WHERE email = 'staff@bliss.test';"
