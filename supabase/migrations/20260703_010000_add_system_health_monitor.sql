-- System health monitor function for the Telegram alert cron
-- (/api/cron/system-health in apps/server). Read-only snapshot of the
-- DB-side metrics we alert on: connection usage, realtime subscriptions,
-- and long-running queries. SECURITY DEFINER so the server (service_role)
-- can read pg_stat_activity without extra grants; locked down to service_role only.

CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'ts', now(),
    'connections_total', (SELECT count(*) FROM pg_stat_activity),
    'connections_max', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    'connections_active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'realtime_subscriptions', (SELECT count(*) FROM realtime.subscription),
    'long_running_queries', (
      SELECT count(*) FROM pg_stat_activity
      WHERE state = 'active'
        AND backend_type = 'client backend'  -- exclude walsender/autovacuum etc. (always "active" by design)
        AND now() - query_start > interval '30 seconds'
        AND query NOT ILIKE '%pg_stat_activity%'
    ),
    'oldest_active_query_seconds', (
      SELECT COALESCE(max(EXTRACT(EPOCH FROM (now() - query_start)))::int, 0)
      FROM pg_stat_activity
      WHERE state = 'active'
        AND backend_type = 'client backend'
        AND query NOT ILIKE '%pg_stat_activity%'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_system_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_system_health() FROM anon;
REVOKE ALL ON FUNCTION public.get_system_health() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO service_role;
