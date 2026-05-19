# Database Schema — theblissathome

Generated: 2026-03-23

Total tables: 54 | Total columns: 841

---

## Table of Contents

### Core Tables
- [profiles](#profiles)
- [customers](#customers)
- [addresses](#addresses)

### Services
- [services](#services)
- [service_addons](#service_addons)
- [service_areas](#service_areas)
- [skills](#skills)

### Bookings
- [bookings](#bookings)
- [booking_services](#booking_services)
- [booking_addons](#booking_addons)
- [booking_slots](#booking_slots)
- [booking_notifications](#booking_notifications)

### Payments & Billing
- [transactions](#transactions)
- [payment_methods](#payment_methods)
- [payouts](#payouts)
- [monthly_bills](#monthly_bills)
- [billing_settings](#billing_settings)
- [tax_information](#tax_information)
- [promotions](#promotions)
- [promotion_usage](#promotion_usage)
- [coupon_codes](#coupon_codes)

### Cancellation Policies
- [cancellation_policy_settings](#cancellation_policy_settings)
- [cancellation_policy_tiers](#cancellation_policy_tiers)

### Staff
- [staff](#staff)
- [staff_applications](#staff_applications)
- [staff_schedules](#staff_schedules)
- [staff_documents](#staff_documents)
- [staff_skills](#staff_skills)
- [staff_service_areas](#staff_service_areas)
- [staff_bank_accounts](#staff_bank_accounts)
- [bank_accounts](#bank_accounts)
- [staff_performance_metrics](#staff_performance_metrics)
- [blocked_dates](#blocked_dates)

### Jobs
- [jobs](#jobs)
- [staff_jobs](#staff_jobs)
- [job_ratings](#job_ratings)
- [reviews](#reviews)
- [sos_alerts](#sos_alerts)

### Hotels
- [hotels](#hotels)
- [hotel_room_categories](#hotel_room_categories)
- [hotel_invoices](#hotel_invoices)

### LINE Integration
- [line_rich_menus](#line_rich_menus)
- [line_bot_commands](#line_bot_commands)
- [line_conversations](#line_conversations)
- [line_flex_templates](#line_flex_templates)
- [line_notification_queue](#line_notification_queue)
- [line_webhook_events](#line_webhook_events)

### Notifications
- [notifications](#notifications)

### System & Config
- [app_settings](#app_settings)
- [settings](#settings)
- [system_logs](#system_logs)

### Thai Geography
- [thai_provinces](#thai_provinces)
- [thai_districts](#thai_districts)
- [thai_subdistricts](#thai_subdistricts)

---

## Core Tables

### profiles

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | - |
| email | text | NO | - |
| role | USER-DEFINED | NO | `'CUSTOMER'::user_role` |
| full_name | text | YES | - |
| phone | text | YES | - |
| avatar_url | text | YES | - |
| status | USER-DEFINED | NO | `'ACTIVE'::user_status` |
| language | text | YES | `'th'::text` |
| created_at | timestamp with time zone | NO | `now()` |
| updated_at | timestamp with time zone | NO | `now()` |
| hotel_id | uuid | YES | - |
| line_user_id | text | YES | - |
| line_display_name | text | YES | - |
| birth_date | date | YES | - |

### customers

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| profile_id | uuid | YES | - |
| full_name | text | NO | - |
| phone | text | NO | - |
| email | text | YES | - |
| birth_date | date | YES | - |
| gender | text | YES | - |
| avatar_url | text | YES | - |
| total_bookings | integer | YES | `0` |
| total_spent | numeric | YES | `0` |
| loyalty_points | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| status | text | YES | `'active'::text` |

### addresses

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| customer_id | uuid | NO | - |
| address_type | text | YES | `'home'::text` |
| address_line_1 | text | YES | - |
| address_line_2 | text | YES | - |
| district | text | YES | - |
| province | text | YES | - |
| postal_code | text | YES | - |
| country | text | YES | `'TH'::text` |
| latitude | numeric | YES | - |
| longitude | numeric | YES | - |
| is_default | boolean | YES | `false` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| recipient_name | text | YES | - |
| phone | text | YES | - |
| address_line | text | YES | - |
| subdistrict | text | YES | - |
| zipcode | text | YES | - |
| label | text | YES | - |
| notes | text | YES | - |

## Services

### services

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| name_th | text | NO | - |
| name_en | text | NO | - |
| description_th | text | YES | - |
| description_en | text | YES | - |
| category | USER-DEFINED | YES | `'massage'::service_category` |
| base_price | numeric | NO | - |
| duration | integer | NO | `90` |
| is_active | boolean | YES | `true` |
| sort_order | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| image_url | text | YES | - |
| duration_options | ARRAY | YES | - |
| hotel_price | numeric | YES | - |
| slug | text | YES | - |
| price_60 | numeric | YES | - |
| price_90 | numeric | YES | - |
| price_120 | numeric | YES | - |
| staff_commission_rate | numeric | YES | - |

### service_addons

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| service_id | uuid | YES | - |
| name_th | text | NO | - |
| name_en | text | NO | - |
| description_th | text | YES | - |
| description_en | text | YES | - |
| price | numeric | NO | - |
| icon | text | YES | - |
| is_active | boolean | YES | `true` |
| sort_order | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### service_areas

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| name_th | text | NO | - |
| name_en | text | NO | - |
| description | text | YES | - |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### skills

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| name_th | text | NO | - |
| name_en | text | NO | - |
| description_th | text | YES | - |
| description_en | text | YES | - |
| category | USER-DEFINED | YES | - |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

## Bookings

### bookings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_number | text | NO | `generate_booking_number()` |
| customer_id | uuid | YES | - |
| hotel_id | uuid | YES | - |
| staff_id | uuid | YES | - |
| service_id | uuid | NO | - |
| booking_date | date | NO | - |
| booking_time | time without time zone | NO | - |
| duration | integer | NO | - |
| is_hotel_booking | boolean | YES | `false` |
| hotel_room_number | text | YES | - |
| address | text | YES | - |
| latitude | numeric | YES | - |
| longitude | numeric | YES | - |
| base_price | numeric | NO | - |
| discount_amount | numeric | YES | `0` |
| final_price | numeric | NO | - |
| status | USER-DEFINED | YES | `'pending'::booking_status` |
| payment_status | USER-DEFINED | YES | `'pending'::payment_status` |
| staff_earnings | numeric | YES | `0` |
| tip_amount | numeric | YES | `0` |
| customer_notes | text | YES | - |
| staff_notes | text | YES | - |
| admin_notes | text | YES | - |
| confirmed_at | timestamp with time zone | YES | - |
| started_at | timestamp with time zone | YES | - |
| completed_at | timestamp with time zone | YES | - |
| cancelled_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| assignment_status | text | YES | `'unassigned'::text` |
| provider_preference | text | YES | - |
| is_multi_service | boolean | YES | `false` |
| recipient_count | integer | YES | `1` |
| service_format | text | YES | `'single'::text` |
| promotion_id | uuid | YES | - |

### booking_services

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | NO | - |
| service_id | uuid | NO | - |
| duration | integer | NO | - |
| price | numeric | NO | - |
| recipient_index | integer | YES | `0` |
| sort_order | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| recipient_name | text | YES | - |

### booking_addons

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | NO | - |
| addon_id | uuid | NO | - |
| quantity | integer | YES | `1` |
| price_per_unit | numeric | NO | - |
| total_price | numeric | NO | - |
| created_at | timestamp with time zone | YES | `now()` |

### booking_slots

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| slot_date | date | NO | - |
| start_time | time without time zone | NO | - |
| end_time | time without time zone | NO | - |
| duration_minutes | integer | NO | `120` |
| area | text | NO | - |
| district | text | YES | - |
| postal_code | text | YES | - |
| total_slots | integer | YES | `5` |
| booked_slots | integer | YES | `0` |
| available_slots | integer | YES | - |
| allowed_services | ARRAY | YES | - |
| min_advance_hours | integer | YES | `3` |
| max_advance_days | integer | YES | `30` |
| base_price | numeric | YES | - |
| peak_hour_multiplier | numeric | YES | `1.00` |
| is_peak_hour | boolean | YES | `false` |
| is_active | boolean | YES | `true` |
| is_holiday | boolean | YES | `false` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### booking_notifications

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | NO | - |
| recipient_type | text | NO | - |
| recipient_id | uuid | YES | - |
| notification_type | text | NO | - |
| title | text | NO | - |
| message | text | NO | - |
| scheduled_at | timestamp with time zone | NO | - |
| sent_at | timestamp with time zone | YES | - |
| send_email | boolean | YES | `true` |
| send_sms | boolean | YES | `false` |
| send_line | boolean | YES | `true` |
| send_push | boolean | YES | `true` |
| status | text | YES | `'pending'::text` |
| error_message | text | YES | - |
| retry_count | integer | YES | `0` |
| max_retries | integer | YES | `3` |
| booking_status | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

## Payments & Billing

### transactions

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | YES | - |
| customer_id | uuid | NO | - |
| payment_method_id | uuid | YES | - |
| transaction_number | text | NO | - |
| amount | numeric | NO | - |
| type | text | NO | - |
| status | text | YES | `'pending'::text` |
| gateway_response | jsonb | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### payment_methods

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| customer_id | uuid | NO | - |
| type | text | YES | - |
| card_last_four | text | YES | - |
| card_brand | text | YES | - |
| bank_name | text | YES | - |
| account_name | text | YES | - |
| is_default | boolean | YES | `false` |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| omise_customer_id | text | YES | - |
| omise_card_id | text | YES | - |
| card_last_digits | text | YES | - |
| card_expiry_month | integer | YES | - |
| card_expiry_year | integer | YES | - |
| cardholder_name | text | YES | - |

### payouts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| bank_account_id | uuid | YES | - |
| reference_number | text | NO | - |
| amount | numeric | NO | - |
| currency | text | YES | `'THB'::text` |
| period_start | date | NO | - |
| period_end | date | NO | - |
| jobs_count | integer | YES | `0` |
| total_earnings | numeric | YES | `0` |
| commission_rate | numeric | YES | `15.00` |
| platform_fee | numeric | YES | `0` |
| status | text | NO | `'pending'::text` |
| requested_at | timestamp with time zone | YES | `now()` |
| processed_at | timestamp with time zone | YES | - |
| completed_at | timestamp with time zone | YES | - |
| failed_at | timestamp with time zone | YES | - |
| payment_method | text | YES | `'bank_transfer'::text` |
| transaction_reference | text | YES | - |
| failure_reason | text | YES | - |
| notes | text | YES | - |
| processed_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| net_amount | numeric | YES | `0` |

### monthly_bills

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| hotel_id | uuid | NO | - |
| month | integer | NO | - |
| year | integer | NO | - |
| total_amount | numeric | YES | `0` |
| commission_amount | numeric | YES | `0` |
| status | text | YES | `'pending'::text` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### billing_settings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| due_day_type | text | NO | `'fixed_day'::text` |
| due_day_value | integer | YES | `15` |
| due_months_after | integer | YES | `1` |
| due_soon_days | integer | YES | `7` |
| overdue_days | integer | YES | `3` |
| warning_days | integer | YES | `7` |
| urgent_days | integer | YES | `14` |
| enable_late_fee | boolean | YES | `false` |
| late_fee_type | text | YES | `'percentage_per_day'::text` |
| late_fee_percentage | numeric | YES | `1.50` |
| late_fee_fixed_amount | numeric | YES | `100.00` |
| admin_contact_phone | text | YES | `'+66-2-123-4567'::text` |
| admin_contact_email | text | YES | `'billing@blissathome.com'::text` |
| admin_contact_line_id | text | YES | - |
| due_soon_message | text | YES | `'ใบแจ้งหนี้ของท่านจะครบกำหนดในอีก {days} วัน'::text` |
| overdue_message | text | YES | `'ใบแจ้งหนี้ของท่านเกินกำหนดชำระแล้ว {days} วัน'::text` |
| warning_message | text | YES | `'กรุณาชำระค่าบริการที่ค้างชำระด่วน'::text` |
| urgent_message | text | YES | `'แจ้งเตือนสุดท้าย! กรุณาติดต่อเราทันที'::text` |
| auto_email_reminder | boolean | YES | `true` |
| auto_line_reminder | boolean | YES | `false` |
| reminder_frequency_days | integer | YES | `3` |
| bank_transfer_enabled | boolean | YES | `true` |
| bank_name | text | YES | `'ธนาคารกสิกรไทย'::text` |
| bank_account_number | text | YES | `'001-1-23456-7'::text` |
| bank_account_name | text | YES | `'บริษัท เดอะ บลิส แอท โฮม จำกัด'::text` |
| cash_payment_enabled | boolean | YES | `true` |
| office_address | text | YES | `'123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'::text` |
| office_hours | text | YES | `'จันทร์-ศุกร์ 9:00-18:00'::text` |
| check_payment_enabled | boolean | YES | `false` |
| check_payable_to | text | YES | `'บริษัท เดอะ บลิส แอท โฮม จำกัด'::text` |
| check_mailing_address | text | YES | - |
| is_active | boolean | YES | `true` |
| applies_to_all_hotels | boolean | YES | `true` |
| hotel_specific_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### tax_information

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| customer_id | uuid | NO | - |
| tax_type | text | NO | - |
| tax_id | text | NO | - |
| company_name | text | YES | - |
| branch_code | text | YES | - |
| address_line | text | NO | - |
| subdistrict | text | YES | - |
| district | text | YES | - |
| province | text | NO | - |
| zipcode | text | NO | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### promotions

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| name_th | character varying | NO | - |
| name_en | character varying | NO | - |
| description_th | text | YES | - |
| description_en | text | YES | - |
| code | character varying | NO | - |
| discount_type | character varying | NO | - |
| discount_value | numeric | NO | - |
| min_order_amount | numeric | YES | - |
| max_discount | numeric | YES | - |
| usage_limit | integer | YES | - |
| usage_limit_per_user | integer | YES | - |
| usage_count | integer | YES | `0` |
| start_date | timestamp with time zone | NO | - |
| end_date | timestamp with time zone | NO | - |
| status | character varying | YES | `'draft'::character varying` |
| applies_to | character varying | YES | `'all_services'::character varying` |
| target_services | ARRAY | YES | - |
| target_categories | ARRAY | YES | - |
| auto_generate_code | boolean | YES | `false` |
| code_prefix | character varying | YES | `''::character varying` |
| code_length | integer | YES | `8` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| image_url | text | YES | - |
| image_alt_text | text | YES | - |
| terms_conditions | text | YES | - |
| max_uses | integer | YES | `0` |
| used_count | integer | YES | `0` |
| min_purchase_amount | numeric | YES | `0` |
| is_active | boolean | YES | `true` |

### promotion_usage

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| promotion_id | uuid | NO | - |
| user_id | uuid | NO | - |
| booking_id | uuid | YES | - |
| discount_amount | numeric | NO | - |
| used_at | timestamp with time zone | YES | `now()` |
| created_at | timestamp with time zone | YES | `now()` |

### coupon_codes

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| promotion_id | uuid | NO | - |
| code | character varying | NO | - |
| usage_limit | integer | YES | `1` |
| usage_count | integer | YES | `0` |
| is_active | boolean | YES | `true` |
| expires_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

## Cancellation Policies

### cancellation_policy_settings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| policy_name | text | NO | - |
| advance_hours | integer | NO | `24` |
| cancellation_fee_percent | numeric | YES | `0` |
| reschedule_fee_percent | numeric | YES | `0` |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### cancellation_policy_tiers

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| tier_name | text | NO | - |
| advance_hours_min | integer | NO | - |
| advance_hours_max | integer | NO | - |
| fee_percent | numeric | NO | `0` |
| sort_order | integer | YES | `0` |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |

## Staff

### staff

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| profile_id | uuid | YES | - |
| name_th | text | NO | - |
| name_en | text | YES | - |
| phone | text | NO | - |
| id_card | text | YES | - |
| address | text | YES | - |
| bank_name | text | YES | - |
| bank_account | text | YES | - |
| bank_account_name | text | YES | - |
| bio_th | text | YES | - |
| bio_en | text | YES | - |
| avatar_url | text | YES | - |
| status | USER-DEFINED | YES | `'pending'::staff_status` |
| rating | numeric | YES | `0` |
| total_reviews | integer | YES | `0` |
| total_jobs | integer | YES | `0` |
| total_earnings | numeric | YES | `0` |
| is_available | boolean | YES | `true` |
| current_location_lat | numeric | YES | - |
| current_location_lng | numeric | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| gender | text | YES | - |
| birth_date | date | YES | - |
| emergency_contact_name | text | YES | - |
| emergency_contact_phone | text | YES | - |
| line_user_id | text | YES | - |

### staff_applications

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| full_name | text | NO | - |
| phone_number | text | NO | - |
| email | text | YES | - |
| skills | ARRAY | YES | - |
| experience_years | integer | YES | `0` |
| status | text | YES | `'pending'::text` |
| application_date | date | YES | `CURRENT_DATE` |
| bio | text | YES | - |
| portfolio_url | text | YES | - |
| availability | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### staff_schedules

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| schedule_date | date | NO | - |
| day_of_week | integer | NO | - |
| start_time | time without time zone | NO | - |
| end_time | time without time zone | NO | - |
| break_start_time | time without time zone | YES | - |
| break_end_time | time without time zone | YES | - |
| break_duration | integer | YES | `30` |
| is_available | boolean | YES | `true` |
| is_recurring | boolean | YES | `false` |
| schedule_type | text | YES | `'regular'::text` |
| preferred_areas | ARRAY | YES | - |
| max_travel_distance | integer | YES | `20` |
| max_bookings_per_day | integer | YES | `8` |
| current_bookings | integer | YES | `0` |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### staff_documents

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| document_type | text | NO | - |
| file_url | text | NO | - |
| file_name | text | NO | - |
| file_size | integer | NO | - |
| mime_type | text | NO | - |
| verification_status | text | NO | `'pending'::text` |
| verified_by | uuid | YES | - |
| verified_at | timestamp with time zone | YES | - |
| rejection_reason | text | YES | - |
| notes | text | YES | - |
| uploaded_at | timestamp with time zone | NO | `now()` |
| expires_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | `now()` |
| updated_at | timestamp with time zone | NO | `now()` |

### staff_skills

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| skill_id | uuid | NO | - |
| level | USER-DEFINED | YES | `'intermediate'::skill_level` |
| years_experience | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |

### staff_service_areas

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| service_area_id | uuid | NO | - |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### staff_bank_accounts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| bank_name | text | NO | - |
| account_number | text | NO | - |
| account_name | text | NO | - |
| branch | text | YES | - |
| is_primary | boolean | YES | `false` |
| is_active | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### bank_accounts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| bank_name | text | NO | - |
| bank_code | text | YES | - |
| account_number | text | NO | - |
| account_name | text | NO | - |
| account_type | text | YES | `'savings'::text` |
| branch_name | text | YES | - |
| branch_code | text | YES | - |
| is_primary | boolean | YES | `false` |
| is_verified | boolean | YES | `false` |
| verification_date | timestamp with time zone | YES | - |
| notes | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### staff_performance_metrics

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| staff_id | uuid | NO | - |
| metric_date | date | NO | - |
| metric_type | text | NO | `'daily'::text` |
| jobs_completed | integer | YES | `0` |
| jobs_cancelled | integer | YES | `0` |
| jobs_no_show | integer | YES | `0` |
| total_working_hours | numeric | YES | `0` |
| average_rating | numeric | YES | `0` |
| total_reviews | integer | YES | `0` |
| five_star_count | integer | YES | `0` |
| four_star_count | integer | YES | `0` |
| three_star_count | integer | YES | `0` |
| two_star_count | integer | YES | `0` |
| one_star_count | integer | YES | `0` |
| total_earnings | numeric | YES | `0` |
| average_job_value | numeric | YES | `0` |
| on_time_percentage | numeric | YES | `0` |
| completion_rate | numeric | YES | `0` |
| customer_satisfaction | numeric | YES | `0` |
| performance_score | numeric | YES | `0` |
| quality_score | numeric | YES | `0` |
| reliability_score | numeric | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### blocked_dates

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| start_date | date | NO | - |
| end_date | date | NO | - |
| reason_type | text | NO | `'holiday'::text` |
| reason_title | text | NO | - |
| reason_description | text | YES | - |
| affects_all_staff | boolean | YES | `true` |
| affected_staff_ids | ARRAY | YES | - |
| affects_all_areas | boolean | YES | `true` |
| affected_areas | ARRAY | YES | - |
| affects_all_services | boolean | YES | `true` |
| affected_service_ids | ARRAY | YES | - |
| alternative_message | text | YES | `'ขออภัย บริการไม่ว่างในวันนี้ กรุณาเลือกวันอื่น'::text` |
| suggested_dates | ARRAY | YES | - |
| is_active | boolean | YES | `true` |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

## Jobs

### jobs

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | NO | - |
| staff_id | uuid | YES | - |
| status | text | YES | `'pending'::text` |
| started_at | timestamp with time zone | YES | - |
| completed_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| amount | numeric | YES | `0` |
| staff_earnings | numeric | YES | `0` |
| scheduled_date | date | YES | - |
| scheduled_time | time without time zone | YES | - |
| duration_minutes | integer | YES | `60` |
| customer_address | text | YES | - |
| customer_latitude | numeric | YES | - |
| customer_longitude | numeric | YES | - |
| notes | text | YES | - |
| service_name | text | YES | - |
| service_name_en | text | YES | - |
| customer_id | uuid | YES | - |
| customer_name | text | YES | - |
| customer_phone | text | YES | - |
| hotel_name | text | YES | - |
| room_number | text | YES | - |
| address | text | YES | - |
| total_jobs | integer | YES | `1` |
| accepted_at | timestamp with time zone | YES | - |
| updated_at | timestamp with time zone | YES | `now()` |
| cancelled_at | timestamp with time zone | YES | - |

### staff_jobs

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_reference | text | YES | - |
| staff_name | text | YES | - |
| hotel_name | text | YES | - |
| job_title | text | NO | `'Thai Traditional Massage'::text` |
| job_description | text | YES | `'บริการนวดแผนไทยโดยนักนวดมืออาชีพ'::text` |
| job_type | text | YES | `'service'::text` |
| scheduled_date | date | NO | `CURRENT_DATE` |
| scheduled_start_time | time without time zone | NO | `'10:00:00'::time without time zone` |
| scheduled_end_time | time without time zone | NO | `'12:00:00'::time without time zone` |
| estimated_duration | integer | NO | `120` |
| customer_address | text | NO | `'ที่อยู่ลูกค้า'::text` |
| latitude | numeric | YES | - |
| longitude | numeric | YES | - |
| location_notes | text | YES | `'โปรดติดต่อลูกค้าก่อนไป 30 นาที'::text` |
| status | text | NO | `'assigned'::text` |
| assigned_at | timestamp with time zone | YES | `now()` |
| accepted_at | timestamp with time zone | YES | - |
| rejected_at | timestamp with time zone | YES | - |
| started_at | timestamp with time zone | YES | - |
| completed_at | timestamp with time zone | YES | - |
| cancelled_at | timestamp with time zone | YES | - |
| base_price | numeric | NO | `1200.00` |
| staff_commission | numeric | YES | `840.00` |
| commission_rate | numeric | YES | `70.00` |
| platform_fee | numeric | YES | `360.00` |
| staff_notes | text | YES | - |
| customer_feedback | text | YES | - |
| admin_notes | text | YES | - |
| rejection_reason | text | YES | - |
| cancellation_reason | text | YES | - |
| customer_rating | integer | YES | `5` |
| service_quality_score | integer | YES | `8` |
| punctuality_score | integer | YES | `9` |
| professionalism_score | integer | YES | `9` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### job_ratings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| job_id | uuid | NO | - |
| staff_id | uuid | NO | - |
| customer_id | uuid | YES | - |
| rating | integer | NO | - |
| review_text | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### reviews

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| booking_id | uuid | NO | - |
| customer_id | uuid | NO | - |
| staff_id | uuid | YES | - |
| hotel_id | uuid | YES | - |
| rating | integer | NO | - |
| comment | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| is_visible | boolean | YES | `true` |
| service_id | uuid | YES | - |

### sos_alerts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| customer_id | uuid | YES | - |
| staff_id | uuid | YES | - |
| status | text | YES | `'pending'::text` |
| message | text | YES | - |
| location_lat | numeric | YES | - |
| location_lng | numeric | YES | - |
| created_at | timestamp with time zone | YES | `now()` |

## Hotels

### hotels

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| name_th | text | NO | - |
| name_en | text | NO | - |
| contact_person | text | YES | - |
| email | text | YES | - |
| phone | text | YES | - |
| address | text | YES | - |
| tax_id | text | YES | - |
| bank_name | text | YES | - |
| bank_account | text | YES | - |
| bank_account_name | text | YES | - |
| commission_rate | integer | YES | `20` |
| status | USER-DEFINED | YES | `'pending'::hotel_status` |
| rating | numeric | YES | `0` |
| total_reviews | integer | YES | `0` |
| total_bookings | integer | YES | `0` |
| monthly_revenue | numeric | YES | `0` |
| recommended_sales_staff | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |
| latitude | numeric | YES | - |
| longitude | numeric | YES | - |
| website | text | YES | - |
| description | text | YES | - |
| bank_account_number | text | YES | - |
| discount_rate | numeric | YES | `0` |
| hotel_slug | text | YES | - |
| auth_user_id | uuid | YES | - |
| login_email | text | YES | - |
| last_login | timestamp with time zone | YES | - |
| login_enabled | boolean | YES | `false` |
| password_change_required | boolean | YES | `true` |
| temporary_password | text | YES | - |

### hotel_room_categories

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| hotel_id | uuid | NO | - |
| category_name_th | text | NO | - |
| category_name_en | text | NO | - |
| category_code | text | NO | - |
| description_th | text | YES | - |
| description_en | text | YES | - |
| room_size_sqm | integer | YES | - |
| max_guests | integer | YES | `2` |
| bed_type | text | YES | - |
| has_spa_corner | boolean | YES | `false` |
| has_bathtub | boolean | YES | `false` |
| has_balcony | boolean | YES | `false` |
| has_city_view | boolean | YES | `false` |
| amenities | ARRAY | YES | - |
| base_service_price | numeric | YES | - |
| room_service_multiplier | numeric | YES | `1.20` |
| room_numbers | ARRAY | YES | - |
| total_rooms | integer | YES | `0` |
| available_rooms | integer | YES | `0` |
| is_active | boolean | YES | `true` |
| sort_order | integer | YES | `0` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### hotel_invoices

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| hotel_id | uuid | NO | - |
| commission_amount | numeric | NO | `0` |
| status | text | YES | `'pending'::text` |
| due_date | date | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

## LINE Integration

### line_rich_menus

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| line_rich_menu_id | text | YES | - |
| menu_name | text | NO | - |
| menu_description | text | YES | - |
| target_type | text | YES | `'staff'::text` |
| target_staff_roles | ARRAY | YES | - |
| target_staff_ids | ARRAY | YES | - |
| size_width | integer | YES | `2500` |
| size_height | integer | YES | `1686` |
| is_selected | boolean | YES | `false` |
| areas | jsonb | NO | - |
| background_image_url | text | YES | - |
| template_type | text | YES | `'custom'::text` |
| is_active | boolean | YES | `true` |
| priority | integer | YES | `0` |
| active_hours_start | time without time zone | YES | - |
| active_hours_end | time without time zone | YES | - |
| active_days | ARRAY | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### line_bot_commands

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| command_name | text | NO | - |
| command_aliases | ARRAY | YES | - |
| description_th | text | NO | - |
| description_en | text | YES | - |
| usage_example | text | YES | - |
| allowed_roles | ARRAY | YES | `ARRAY['staff'::text]` |
| requires_auth | boolean | YES | `true` |
| response_type | text | YES | `'text'::text` |
| response_template | text | YES | - |
| response_function | text | YES | - |
| accepts_parameters | boolean | YES | `false` |
| parameter_pattern | text | YES | - |
| parameter_description | text | YES | - |
| usage_count | integer | YES | `0` |
| last_used_at | timestamp with time zone | YES | - |
| is_active | boolean | YES | `true` |
| is_visible_in_help | boolean | YES | `true` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### line_conversations

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| line_user_id | text | NO | - |
| staff_id | uuid | YES | - |
| conversation_type | text | NO | `'private'::text` |
| group_id | text | YES | - |
| room_id | text | YES | - |
| message_id | text | NO | - |
| message_type | text | NO | - |
| message_text | text | YES | - |
| message_data | jsonb | YES | - |
| direction | text | NO | - |
| sender_type | text | NO | `'staff'::text` |
| is_command | boolean | YES | `false` |
| command_name | text | YES | - |
| reply_to_message_id | text | YES | - |
| is_read | boolean | YES | `false` |
| delivered_at | timestamp with time zone | YES | - |
| read_at | timestamp with time zone | YES | - |
| webhook_event_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |

### line_flex_templates

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| template_name | text | NO | - |
| template_category | text | NO | - |
| title_th | text | NO | - |
| title_en | text | YES | - |
| description | text | YES | - |
| flex_content | jsonb | NO | - |
| alt_text_template | text | NO | - |
| required_variables | ARRAY | YES | - |
| optional_variables | ARRAY | YES | - |
| variable_descriptions | jsonb | YES | - |
| usage_count | integer | YES | `0` |
| last_used_at | timestamp with time zone | YES | - |
| version | integer | YES | `1` |
| is_current_version | boolean | YES | `true` |
| parent_template_id | uuid | YES | - |
| is_active | boolean | YES | `true` |
| created_by | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### line_notification_queue

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| line_user_id | text | NO | - |
| staff_id | uuid | YES | - |
| message_type | text | NO | - |
| message_content | jsonb | NO | - |
| alt_text | text | YES | - |
| notification_category | text | NO | - |
| notification_priority | text | YES | `'normal'::text` |
| scheduled_at | timestamp with time zone | NO | - |
| timezone | text | YES | `'Asia/Bangkok'::text` |
| status | text | YES | `'pending'::text` |
| sent_at | timestamp with time zone | YES | - |
| line_message_id | text | YES | - |
| retry_count | integer | YES | `0` |
| max_retries | integer | YES | `3` |
| last_retry_at | timestamp with time zone | YES | - |
| error_message | text | YES | - |
| related_booking_id | uuid | YES | - |
| related_job_id | uuid | YES | - |
| batch_id | uuid | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### line_webhook_events

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| event_type | text | NO | - |
| event_mode | text | YES | `'active'::text` |
| source_type | text | NO | - |
| source_user_id | text | YES | - |
| source_group_id | text | YES | - |
| source_room_id | text | YES | - |
| timestamp | timestamp with time zone | NO | - |
| webhook_event_id | text | NO | - |
| reply_token | text | YES | - |
| raw_event_data | jsonb | NO | - |
| processing_status | text | YES | `'pending'::text` |
| processed_at | timestamp with time zone | YES | - |
| error_message | text | YES | - |
| retry_count | integer | YES | `0` |
| response_sent | boolean | YES | `false` |
| response_data | jsonb | YES | - |
| created_at | timestamp with time zone | YES | `now()` |

## Notifications

### notifications

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | YES | - |
| type | text | YES | - |
| title | text | YES | - |
| message | text | YES | - |
| is_read | boolean | YES | `false` |
| created_at | timestamp with time zone | YES | `now()` |

## System & Config

### app_settings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| key | text | NO | - |
| value | jsonb | YES | - |
| description | text | YES | - |
| is_public | boolean | YES | `false` |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### settings

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| setting_key | text | NO | - |
| setting_value | jsonb | NO | - |
| description | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |
| updated_at | timestamp with time zone | YES | `now()` |

### system_logs

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | YES | - |
| action | text | NO | - |
| resource_type | text | YES | - |
| resource_id | uuid | YES | - |
| old_values | jsonb | YES | - |
| new_values | jsonb | YES | - |
| ip_address | text | YES | - |
| user_agent | text | YES | - |
| created_at | timestamp with time zone | YES | `now()` |

## Thai Geography

### thai_provinces

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | integer | NO | `nextval('thai_provinces_id_seq'::regclass)` |
| name_th | text | NO | - |
| name_en | text | NO | - |
| province_code | integer | YES | - |

### thai_districts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | integer | NO | `nextval('thai_districts_id_seq'::regclass)` |
| province_id | integer | NO | - |
| district_code | integer | YES | - |
| name_th | text | NO | - |
| name_en | text | NO | - |

### thai_subdistricts

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | integer | NO | `nextval('thai_subdistricts_id_seq'::regclass)` |
| district_id | integer | NO | - |
| name_th | text | NO | - |
| name_en | text | NO | - |
| zipcode | text | NO | - |

