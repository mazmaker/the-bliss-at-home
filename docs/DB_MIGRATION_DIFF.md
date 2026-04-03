# DB Schema vs Migration Files — Comparison Report

Generated: 2026-03-23

## Summary

- **Tables in DB but NOT in any migration: 27**
- **Columns in DB but NOT in any migration: 44**
- **Tables in migrations but NOT in DB: 5**

---

## Tables Missing from Migrations

These tables exist in the current DB schema (DB_SCHEMA.md) but have **no CREATE TABLE** statement in any migration file:

| # | Table Name | Category |
|---|-----------|----------|
| 1 | `service_addons` | Services |
| 2 | `service_areas` | Services |
| 3 | `booking_addons` | Bookings |
| 4 | `booking_slots` | Bookings |
| 5 | `booking_notifications` | Bookings |
| 6 | `transactions` | Payments & Billing |
| 7 | `payment_methods` | Payments & Billing |
| 8 | `billing_settings` | Payments & Billing |
| 9 | `tax_information` | Payments & Billing |
| 10 | `staff_applications` | Staff |
| 11 | `staff_schedules` | Staff |
| 12 | `staff_documents` | Staff |
| 13 | `staff_service_areas` | Staff |
| 14 | `staff_bank_accounts` | Staff |
| 15 | `bank_accounts` | Staff |
| 16 | `blocked_dates` | Staff |
| 17 | `jobs` | Jobs |
| 18 | `staff_jobs` | Jobs |
| 19 | `job_ratings` | Jobs |
| 20 | `sos_alerts` | Jobs |
| 21 | `hotel_room_categories` | Hotels |
| 22 | `hotel_invoices` | Hotels |
| 23 | `addresses` | Core |
| 24 | `line_rich_menus` | LINE Integration |
| 25 | `line_bot_commands` | LINE Integration |
| 26 | `line_conversations` | LINE Integration |
| 27 | `line_flex_templates` | LINE Integration |
| 28 | `line_notification_queue` | LINE Integration |
| 29 | `line_webhook_events` | LINE Integration |
| 30 | `thai_provinces` | Thai Geography |
| 31 | `thai_districts` | Thai Geography |
| 32 | `thai_subdistricts` | Thai Geography |

> **Note:** These 32 tables were likely created directly in the Supabase SQL Editor or via the Dashboard, not through migration files. They exist in the live database but have no migration tracking.

---

## Columns Missing from Migrations

For each table, columns that exist in DB_SCHEMA.md but are NOT found in any CREATE TABLE or ALTER TABLE migration.

### profiles
- `birth_date` (date) — not found in migrations
- `hotel_id` added via `20260220150000_add_hotel_id_to_profiles.sql` (OK)
- `line_user_id` added via `20260211000000_add_line_user_id_to_profiles.sql` (OK)
- `line_display_name` added via `20260212000000_add_line_linking_columns.sql` (OK)

> `line_picture_url` was added in migration `20260212000000` but is NOT in DB_SCHEMA.md — may have been dropped later.

### customers
DB has these columns NOT in any migration:
- `email` (text) — not found in migrations (migration has `address`, `date_of_birth`, `preferences`, `last_booking_date` instead)
- `birth_date` (date) — not found (migration used `date_of_birth`)
- `gender` (text) — not found in migrations
- `avatar_url` (text) — not found in migrations
- `loyalty_points` (integer) — not found in migrations
- `status` (text) — not found in migrations
- `recipient_name` — column in `addresses` table, not `customers`

> The migration (005) created customers with `address`, `date_of_birth`, `preferences`, `last_booking_date` columns. The DB schema shows different columns (`email`, `birth_date`, `gender`, `avatar_url`, `loyalty_points`, `status`). The table appears to have been significantly restructured outside of migrations.

### services
- `slug` (text) — not found in migrations
- `staff_commission_rate` (numeric) — not found in migrations (referenced in functions but never added via ALTER TABLE)
- `description_th`, `description_en` — present in original CREATE TABLE (OK)
- `duration_options` — type is `ARRAY` in DB, but added as `JSONB` in migration `20260209000003`. Was likely altered outside migrations.

### bookings
- `assignment_status` (text) — not found in migrations
- `promotion_id` (uuid) — not found in migrations

> Columns `is_multi_service`, `recipient_count`, `service_format`, `provider_preference` were added via migrations (OK). Columns `commission_rate_snapshot`, `price_charged`, `service_revenue`, `total_calculated_duration`, `services_total_price` were added via migrations but are NOT in DB_SCHEMA.md — may have been dropped.

### booking_services
- `recipient_name` (text) — present in CREATE TABLE `20260212130000` (OK)
- `updated_at` column in migration but NOT in DB_SCHEMA.md

### staff
- `birth_date` (date) — not found in migrations
- `emergency_contact_name` (text) — not found in migrations
- `emergency_contact_phone` (text) — not found in migrations
- `line_user_id` (text) — not found in migrations (exists in staff DB table, added via SQL Editor presumably)
- `gender` added via `20260219105530` (OK)

> `invite_token`, `invite_token_expires_at` added via `20260214000000` but NOT in DB_SCHEMA.md — may have been dropped.
> `specializations`, `preferred_client_types`, `gender_updated_at` added via `20260219105530` but NOT in DB_SCHEMA.md — may have been dropped.

### hotels
- `recommended_sales_staff` (text) — not found in migrations
- `website` (text) — not found in migrations
- `description` (text) — not found in migrations
- `bank_account_number` (text) — not found in migrations

> `discount_rate`, `hotel_slug`, `auth_user_id`, `login_email`, `last_login`, `login_enabled`, `password_change_required`, `temporary_password`, `latitude`, `longitude` all added via migrations (OK).
> `password_reset_token`, `password_reset_expires_at`, `settings` (JSONB) added via migrations but NOT in DB_SCHEMA.md — may have been dropped.

### promotions
- `image_alt_text` (text) — not found in migrations
- `terms_conditions` (text) — not found in migrations
- `max_uses` (integer) — not found in migrations
- `used_count` (integer) — not found in migrations
- `min_purchase_amount` (numeric) — not found in migrations

> `image_url`, `status`, `usage_limit_per_user`, `auto_generate_code`, `code_prefix`, `code_length` added via migrations (OK).

### monthly_bills
DB schema shows: `id, hotel_id, month, year, total_amount, commission_amount, status, created_at, updated_at`
Migration (008) has: `id, hotel_id, bill_number, month, year, period_start, period_end, total_bookings, total_base_price, total_discount, total_amount, status, due_date, paid_at, created_at, updated_at`

Missing from DB but in migration: `bill_number`, `period_start`, `period_end`, `total_bookings`, `total_base_price`, `total_discount`, `due_date`, `paid_at`
Missing from migration but in DB:
- `commission_amount` (numeric) — not found in migrations

### payouts
DB has significantly more columns than migration (008). Missing from migrations:
- `bank_account_id` (uuid) — not in migration
- `reference_number` (text) — not in migration
- `currency` (text) — not in migration
- `commission_rate` (numeric) — not in migration
- `platform_fee` (numeric) — not in migration
- `requested_at` (timestamptz) — not in migration
- `processed_at` (timestamptz) — not in migration
- `completed_at` (timestamptz) — not in migration
- `failed_at` (timestamptz) — not in migration
- `payment_method` (text) — not in migration
- `transaction_reference` (text) — not in migration
- `failure_reason` (text) — not in migration
- `notes` (text) — not in migration
- `processed_by` (uuid) — not in migration
- `net_amount` (numeric) — not in migration
- `jobs_count` (integer) — not in migration
- `total_earnings` (numeric) — in migration but different context

> The `payouts` table was heavily restructured outside of migrations. Migration has `payout_number, month, year, period_start, period_end, total_bookings, total_tips, total_amount, paid_at, transfer_receipt` — most of which are NOT in DB schema.

### settings
DB schema shows: `id, setting_key, setting_value, description, created_at, updated_at`
Migration (009) has: `id, key, value, description, updated_at`

Differences:
- DB has `setting_key` — migration has `key`
- DB has `setting_value` — migration has `value`
- DB has `created_at` — not in migration

> Column names were likely renamed outside of migrations.

### app_settings
DB schema shows: `id, key, value, description, is_public, created_at, updated_at`
Migration has: `id, setting_key, setting_value, setting_type, is_sensitive, description, created_at, updated_at`

Differences:
- DB has `key` — migration has `setting_key`
- DB has `value` — migration has `setting_value`
- DB has `is_public` — migration has `is_sensitive` + `setting_type`

> Table was restructured outside of migrations.

### reviews
DB schema vs migration (007):
- DB has `comment` (text) — migration has `review` (text)
- DB has `hotel_id` (uuid) — not in migration
- DB has `service_id` (uuid) — in migration (OK)
- DB is missing migration columns: `cleanliness_rating`, `professionalism_rating`, `skill_rating`, `updated_at`

### notifications
DB schema vs migration (007):
- DB is missing migration columns: `data` (jsonb), `read_at` (timestamptz)
- DB has `type` as nullable YES — migration has `type TEXT NOT NULL`
- DB has `title` as nullable YES — migration has `title TEXT NOT NULL`
- DB has `message` as nullable YES — migration has `message TEXT NOT NULL`

### staff_performance_metrics
DB schema vs migration (20260208000000):
- DB has completely different column set than migration
- DB columns: `id, staff_id, metric_date, metric_type, jobs_completed, jobs_cancelled, jobs_no_show, total_working_hours, average_rating, total_reviews, five_star_count, four_star_count, three_star_count, two_star_count, one_star_count, total_earnings, average_job_value, on_time_percentage, completion_rate, customer_satisfaction, performance_score, quality_score, reliability_score, created_at, updated_at`
- Migration columns: `id, staff_id, year, month, total_jobs, completed_jobs, cancelled_jobs, pending_jobs, total_job_offers, accepted_job_offers, avg_response_time_minutes, completion_rate, cancel_rate, response_rate, total_ratings, avg_rating, total_earnings, total_tips, performance_score, created_at, updated_at`

> Table was completely restructured outside of migrations.

### cancellation_policy_settings
DB schema vs migration (`20260220_create_cancellation_policy_tables.sql`):
- DB has: `id, policy_name, advance_hours, cancellation_fee_percent, reschedule_fee_percent, is_active, created_at, updated_at`
- Migration has: `id, policy_title_th, policy_title_en, policy_description_th, policy_description_en, max_reschedules_per_booking, refund_processing_days, is_active, created_at, updated_at`
- Completely different column structures

### cancellation_policy_tiers
DB schema vs migration:
- DB has: `id, tier_name, advance_hours_min, advance_hours_max, fee_percent, sort_order, is_active, created_at`
- Migration has: `id, min_hours_before, max_hours_before, can_cancel, can_reschedule, refund_percentage, reschedule_fee, label_th, label_en, sort_order, is_active, created_at, updated_at`
- Completely different column structures

### system_logs
DB schema vs migration (`20260212140100`):
- DB has: `id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, created_at`
- Migration has: `id, action, details, user_id, ip_address, user_agent, created_at`
- DB has extra columns not in migration: `resource_type`, `resource_id`, `old_values`, `new_values`
- Migration has column not in DB: `details` (jsonb)

---

## Tables in Migrations but NOT in DB

| # | Table Name | Migration File | Notes |
|---|-----------|----------------|-------|
| 1 | `service_images` | `003_create_services_and_skills.sql` | Not in DB_SCHEMA.md — likely dropped |
| 2 | `hotel_invitations` | `20260219201825_scalable_hotel_onboarding_system.sql` | Not in DB_SCHEMA.md — likely dropped |
| 3 | `refund_transactions` | `20260219_create_refund_system.sql` | Not in DB_SCHEMA.md — likely dropped or renamed |
| 4 | `cancellation_notifications` | `20260219_create_refund_system.sql` | Not in DB_SCHEMA.md — likely dropped |
| 5 | `receipt_sequences` | `20260221_add_receipt_support.sql` | Not in DB_SCHEMA.md — likely dropped |

---

## RLS Policies Comparison

> **Note:** DB_SCHEMA.md does not contain RLS policy definitions, so a full comparison cannot be performed. RLS policies are only tracked in migration files.

### Key RLS Policy Files in Migrations
- `001_create_profiles.sql` — profiles policies
- `004_create_staff_and_hotels.sql` — staff, staff_skills, hotels policies
- `005_create_customers_table.sql` — customers policies
- `006_create_bookings_table.sql` — bookings policies
- `007_create_reviews_and_notifications.sql` — reviews, notifications policies
- `008_create_billing_tables.sql` — monthly_bills, payouts policies
- `010_rename_provider_to_staff.sql` — recreated all admin policies for PROVIDER->STAFF enum change
- `011_fix_profile_policies.sql` — profile policy fixes
- Multiple `fix_*_rls*` files for ongoing policy corrections
- `20260214000000_add_invite_token_to_staff.sql` — invite token RLS policies
- `20260219201825_scalable_hotel_onboarding_system.sql` — hotel_invitations policies

### Tables with No RLS Policies in Migrations (but exist in DB)
Since these tables have no CREATE TABLE in migrations, their RLS policies are also untracked:
- All 32 tables listed in "Tables Missing from Migrations" above

---

## Critical Findings

### 1. Schema Drift is Significant
32 out of 54 tables (59%) have no CREATE TABLE in any migration file. These were created directly in the database, meaning:
- No version control for their schema
- Cannot recreate the database from migrations alone
- No audit trail for schema changes

### 2. Heavily Restructured Tables
Several tables have been significantly altered outside of migrations:
- `customers` — different columns than migration
- `payouts` — completely different structure
- `settings` — column names changed
- `app_settings` — column names and types changed
- `staff_performance_metrics` — completely different columns
- `cancellation_policy_settings` — completely different columns
- `cancellation_policy_tiers` — completely different columns
- `system_logs` — different column structure
- `reviews` — column names changed (`review` -> `comment`)

### 3. Missing Critical Business Tables
Key operational tables like `jobs`, `staff_jobs`, `addresses`, `transactions`, `payment_methods`, and all LINE integration tables have no migration files, making them impossible to recreate from source control.

### 4. Columns Added Without Migrations
At least 44 columns across tracked tables exist in the DB but have no corresponding ALTER TABLE ADD COLUMN in any migration file.
