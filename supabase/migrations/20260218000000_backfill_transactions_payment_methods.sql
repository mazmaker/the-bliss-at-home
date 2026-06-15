-- [F-7] Schema-drift backfill — transactions & payment_methods
--
-- These two tables exist in the LIVE database but had NO CREATE TABLE migration. A rebuild
-- from migrations (`supabase db reset`) would fail at 20260219_create_refund_system.sql,
-- whose refund_transactions.payment_transaction_id FK references transactions(id).
-- This migration recreates them with IF NOT EXISTS, so it is a NO-OP against the existing
-- live DB and makes a fresh rebuild succeed. It is dated before the refund-system migration.
--
-- Reconstructed from packages/supabase/src/types/database.types.ts (transactions @ Row,
-- payment_methods @ Row). The generated types expose column names + nullability only, NOT
-- the exact pg types / constraints / defaults — reconcile against the true live DDL (e.g.
-- via `supabase db dump`) before relying on this for a production rebuild.

create extension if not exists "pgcrypto";

-- transactions: customer Omise charge records (World 2 / Track A)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete no action,
  customer_id uuid not null,
  amount numeric not null,
  currency text default 'THB',
  payment_method text not null,
  payment_provider text,
  description text not null,
  status text,
  transaction_number text not null default ('TXN' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  omise_charge_id text,
  omise_transaction_id text,
  card_brand text,
  card_last_digits text,
  receipt_number text,
  receipt_url text,
  metadata jsonb,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_transactions_booking_id on public.transactions(booking_id);
create index if not exists idx_transactions_omise_charge_id on public.transactions(omise_charge_id);
create index if not exists idx_transactions_status on public.transactions(status);

-- payment_methods: customer saved cards (Omise)
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  card_brand text not null,
  card_last_digits text not null,
  card_expiry_month integer not null,
  card_expiry_year integer not null,
  cardholder_name text not null,
  omise_card_id text not null,
  omise_customer_id text,
  is_active boolean default true,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payment_methods_customer_id on public.payment_methods(customer_id);
