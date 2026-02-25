#!/bin/bash

echo "🧹 CLEANING UP DEBUG FILES FROM BOOKING RLS FIX..."

# Files created during booking RLS debugging
DEBUG_FILES=(
  "fix-bookings-rls-now.js"
  "fix-bookings-rls-direct.js"
  "fix-bookings-rls-final.js"
  "verify-booking-insert.js"
  "test-booking-insert.js"
  "test-booking-rls-fix.js"
  "check-bookings-schema.js"
  "get-real-service.js"
  "debug-hotel-user-role.js"
  "test-rls-auth-uid.js"
  "bookings-rls-final-solution.js"
  "apply-bookings-rls.js"
  "run-bookings-rls-now.js"
  "debug-auth-token.js"
  "disable-rls-now.js"
)

echo "Files to delete:"
for file in "${DEBUG_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  - $file"
  fi
done

echo ""
read -p "Delete these files? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for file in "${DEBUG_FILES[@]}"; do
    if [ -f "$file" ]; then
      rm "$file"
      echo "  ✅ Deleted: $file"
    fi
  done
  echo ""
  echo "🎉 Cleanup complete!"
else
  echo "❌ Cleanup cancelled"
fi