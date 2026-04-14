
-- Fix the security definer view issue by making it security invoker
DROP VIEW IF EXISTS public.clients_safe;
CREATE VIEW public.clients_safe
  WITH (security_invoker = true)
  AS SELECT id, name, email, plan, sync_enabled, selected_sheet_name, selected_sheet_id, last_synced_at, created_at, updated_at
  FROM public.clients;
