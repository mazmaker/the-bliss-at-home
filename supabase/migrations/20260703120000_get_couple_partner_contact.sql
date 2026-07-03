-- #7 Couple: let a staff see their couple-booking PARTNER's name + phone.
--
-- Problem: the staff app can only SELECT its OWN job row (RLS "Staff can view jobs"
-- keys on staff_id=auth.uid()), so a client join can't reach the sibling job to find
-- the partner's staff. This SECURITY DEFINER RPC reads across the sibling job safely.
--
-- IDOR-safe: the caller must OWN p_job_id (me.staff_id = auth.uid()), AND-ed into the
-- query, so asking about someone else's job returns 0 rows. auth.uid() reads the
-- caller's JWT even inside SECURITY DEFINER. Read-only; grants tightened to authenticated.
CREATE OR REPLACE FUNCTION public.get_couple_partner_contact(p_job_id uuid)
RETURNS TABLE(partner_name text, partner_phone text, job_index int, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(s.name_th, s.name_en) AS partner_name,
         s.phone                        AS partner_phone,
         sib.job_index,
         sib.status::text               AS status   -- cast enum -> text (RETURNS TABLE type match)
  FROM jobs sib
  JOIN staff s ON s.profile_id = sib.staff_id
  WHERE sib.booking_id = (SELECT booking_id FROM jobs WHERE id = p_job_id)
    AND sib.id <> p_job_id
    AND sib.staff_id IS NOT NULL
    AND sib.status IS DISTINCT FROM 'cancelled'::job_status   -- IS DISTINCT FROM: keep NULL-status siblings
    -- IDOR guard: caller must OWN p_job_id AND still be an active (non-cancelled) participant.
    -- (A cancelled caller must not keep pulling the partner's contact — symmetric with the sibling filter.)
    AND EXISTS (SELECT 1 FROM jobs me
                WHERE me.id = p_job_id
                  AND me.staff_id = auth.uid()
                  AND me.status IS DISTINCT FROM 'cancelled'::job_status);
$$;

-- Default CREATE grants EXECUTE to PUBLIC — revoke it and expose only to logged-in users.
REVOKE EXECUTE ON FUNCTION public.get_couple_partner_contact(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_couple_partner_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_couple_partner_contact(uuid) TO authenticated;

-- Rollback: DROP FUNCTION public.get_couple_partner_contact(uuid);
