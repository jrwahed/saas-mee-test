
-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  page_access text[] DEFAULT '{}',
  crm_see_all boolean DEFAULT false,
  crm_can_assign boolean DEFAULT false,
  crm_can_delete boolean DEFAULT false,
  crm_can_add boolean DEFAULT false,
  crm_see_all_comments boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their own permissions
CREATE POLICY "user_permissions_select_own"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR org_id = get_user_org_id());

-- RLS: owner can manage all permissions in their org
CREATE POLICY "user_permissions_manage_owner"
ON public.user_permissions
FOR ALL
TO authenticated
USING (org_id = get_user_org_id() AND (get_user_role() IN ('owner', 'super_admin')))
WITH CHECK (org_id = get_user_org_id() AND (get_user_role() IN ('owner', 'super_admin')));

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE(
  page_access text[],
  crm_see_all boolean,
  crm_can_assign boolean,
  crm_can_delete boolean,
  crm_can_add boolean,
  crm_see_all_comments boolean,
  is_custom boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT page_access, crm_see_all, crm_can_assign, crm_can_delete, crm_can_add, crm_see_all_comments, is_custom
  FROM user_permissions
  WHERE user_id = auth.uid()
  AND org_id = get_user_org_id()
  LIMIT 1;
$$;

-- Update get_org_members_with_email to also return all roles including viewer and super_admin
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
  WHERE om.org_id = get_user_org_id();
END;
$$;
