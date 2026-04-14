-- Fix: use auth.jwt() instead of querying auth.users directly
DROP POLICY IF EXISTS "leads_org_isolation" ON public.leads;

CREATE POLICY "leads_org_isolation" ON public.leads
FOR ALL
TO authenticated
USING (
  (org_id = get_user_org_id())
  AND (
    (get_user_role() IN ('owner', 'marketing_manager'))
    OR (
      get_user_role() = 'sales_rep'
      AND assigned_to = (auth.jwt()->>'email')
    )
  )
);