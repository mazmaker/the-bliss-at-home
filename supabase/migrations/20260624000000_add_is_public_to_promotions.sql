-- Add is_public flag to promotions
-- Controls whether a promotion is listed on the customer-facing promotions page.
--   true  = shown on customer app (default, preserves existing behavior)
--   false = "secret" promo: not listed, but the code still works when entered manually
-- Note: this is independent of `status`. A secret promo is status='active' + is_public=false.

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.promotions.is_public IS
  'Whether the promotion appears on the customer promotions list. false = secret/code-only promo (code still validates).';

-- Index to keep the customer list query fast (active + public + in date range)
CREATE INDEX IF NOT EXISTS idx_promotions_public_active
  ON public.promotions (is_public, status)
  WHERE is_public = true AND status = 'active';
