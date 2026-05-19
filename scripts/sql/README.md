# SQL Scripts - Organized

## 📁 Folder Structure

### 🔍 debug/ (11 files)
Development and debugging queries:
- `check_*.sql` - Database inspection queries
- `debug_*.sql` - Troubleshooting scripts
- Query existing data and structure

### 🛠️ fixes/ (14 files)
Database fix and repair scripts:
- `fix_*.sql` - Bug fixes and corrections
- `manual-fix.sql` - Manual intervention scripts
- `apply_fix.sql` - General fix applications
- `restore_*.sql` - Data restoration scripts
- `safe_*.sql` - Safe operation scripts

### 📊 data/ (8 files)
Data creation and population:
- `create_*.sql` - Table/data creation
- `complete_*.sql` - Data completion scripts
- `real_*.sql` - Production data scripts
- Initial data setup and population

### ⏰ temp/ (9 files) 
Temporary development files (.gitignored):
- `temp_*.sql` - Temporary scripts
- `test_*.sql` - Test queries
- `COPY-*.sql` - Copy-paste utilities
- Experimental and one-time scripts

## 🚨 Files NOT Moved (Referenced by Code)

### ✅ Safe Locations:
```bash
supabase/migrations/           # Supabase CLI requires this location
supabase/setup_*.sql          # Referenced by setup scripts  
scripts/*.sql                 # Already in scripts folder
```

## 🎯 Usage Guidelines

### For Development:
1. **Debugging** → Use `debug/` folder
2. **Bug Fixes** → Add to `fixes/` folder  
3. **Data Setup** → Use `data/` folder
4. **Experiments** → Use `temp/` folder (auto-ignored by git)

### For Production:
- Use `supabase/migrations/` for actual database changes
- Reference existing scripts for maintenance

## 🔒 Safety Notes
- All files in `temp/` are ignored by git
- Original migration files remain untouched
- Scripts referenced by code remain in original locations
- No existing functionality was affected by this reorganization