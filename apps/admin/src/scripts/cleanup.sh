#!/bin/bash
# Cleanup temporary scripts

echo "🧹 Cleaning up temporary scripts..."

# List files to remove
FILES_TO_REMOVE=(
  "checkDatabase.ts"
  "testAuth.ts"
  "fixOriginalAdmin.ts"
  "diagnoseAuthProblem.ts"
  "createNewAdmin.ts"
  "syncAdminProfile.ts"
)

# Remove files
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "src/scripts/$file" ]; then
    rm "src/scripts/$file"
    echo "✅ Removed: $file"
  fi
done

echo "✨ Cleanup complete!"