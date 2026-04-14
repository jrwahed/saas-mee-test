
-- Create a SECURITY DEFINER function to get org members with their emails
-- This bypasses the auth.users restriction
CREATE OR REPLACE FUNCTION public.get_org_members_with_email()
RETURNS TABLE(user_id uuid, email text, display_name text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.user_id,
    au.email::text,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))::text as display_name,
    om.role::text
  FROM organization_members om
  JOIN auth.users au ON au.id = om.user_id
  WHERE om.org_id = get_user_org_id()
  AND om.role IN ('sales_rep', 'sales_manager', 'team_leader', 'owner');
END;
$$;
