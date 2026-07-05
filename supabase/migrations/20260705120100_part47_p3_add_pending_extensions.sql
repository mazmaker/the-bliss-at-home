-- PART47 P3: pending_extensions — the manual_qr "customer extend → admin confirm → apply" flow.
-- Under payment_mode='manual_qr' a paid customer extend is rejected at the gate (410), so the
-- extension is stored here as PENDING (never a booking_services is_extension row, whose AFTER-INSERT
-- triggers would apply it immediately) and admin confirmation is the apply site.
-- Applied to prod (rbdvlfriqjnwpxmmgisf) via the Supabase MCP apply_migration
-- (name: part47_p3_add_pending_extensions) on 2026-07-05; this file records the identical DDL in the
-- repo so the tracked schema matches prod. Rollback: DROP TABLE public.pending_extensions;

CREATE TABLE IF NOT EXISTS public.pending_extensions (
  id                         uuid        NOT NULL DEFAULT gen_random_uuid(),
  booking_id                 uuid        NOT NULL,
  service_id                 uuid,
  additional_duration        integer     NOT NULL,
  extension_price            numeric     NOT NULL DEFAULT 0,
  discount_amount            numeric     NOT NULL DEFAULT 0,
  final_extension_price      numeric     NOT NULL DEFAULT 0,
  promotion_id               uuid,
  recipient_index            integer     NOT NULL DEFAULT 0,
  recipient_name             text,
  customer_name              text,
  booking_number             text,
  status                     text        NOT NULL DEFAULT 'pending',
  applied_booking_service_id uuid,
  requested_by               text        NOT NULL DEFAULT 'customer',
  confirmed_by               uuid,
  requested_at               timestamptz NOT NULL DEFAULT now(),
  confirmed_at               timestamptz,
  cancelled_at               timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_extensions_pkey PRIMARY KEY (id),
  CONSTRAINT pending_extensions_booking_id_fkey FOREIGN KEY (booking_id)
    REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT pending_extensions_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text]))
);

CREATE INDEX IF NOT EXISTS idx_pending_extensions_booking_id
  ON public.pending_extensions USING btree (booking_id);
-- Partial index for the admin observability query (WHERE status='pending').
CREATE INDEX IF NOT EXISTS idx_pending_extensions_pending
  ON public.pending_extensions USING btree (booking_id) WHERE (status = 'pending'::text);

ALTER TABLE public.pending_extensions ENABLE ROW LEVEL SECURITY;

-- Admin: full access (the server writes via the service-role key, which bypasses RLS anyway).
CREATE POLICY "Admins can manage all pending extensions" ON public.pending_extensions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  ));

-- Customer: read-only, own bookings' pending extensions (booking → customer → profile_id).
CREATE POLICY "Customers can view own pending extensions" ON public.pending_extensions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.id = pending_extensions.booking_id AND c.profile_id = auth.uid()
  ));
