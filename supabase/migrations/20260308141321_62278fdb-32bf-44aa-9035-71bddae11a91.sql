
-- =============================================
-- 1. FIX: clients table - replace broad policy with org-scoped + create secure view hiding tokens
-- =============================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "clients_authenticated_only" ON public.clients;

-- Add org-scoped SELECT policy (only members of the same org can see clients linked via campaigns_data/leads)
CREATE POLICY "clients_org_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT DISTINCT cd.client_id FROM campaigns_data cd
      WHERE cd.org_id = public.get_user_org_id()
      UNION
      SELECT DISTINCT l.client_id FROM leads l
      WHERE l.org_id = public.get_user_org_id()
    )
  );

-- Add org-scoped INSERT/UPDATE/DELETE for owners only
CREATE POLICY "clients_org_write" ON public.clients
  FOR ALL TO authenticated
  USING (
    id IN (
      SELECT DISTINCT cd.client_id FROM campaigns_data cd
      WHERE cd.org_id = public.get_user_org_id()
    )
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    public.get_user_role() = 'owner'
  );

-- Create a secure view that hides sensitive token columns
CREATE OR REPLACE VIEW public.clients_safe AS
  SELECT id, name, email, plan, sync_enabled, selected_sheet_name, selected_sheet_id, last_synced_at, created_at, updated_at
  FROM public.clients;

-- =============================================
-- 2. FIX: campaigns table - drop any open policies, add scoped policy
-- =============================================

-- Drop all potentially open policies
DROP POLICY IF EXISTS "allow select campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "allow insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "allow all on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_authenticated_only" ON public.campaigns;

-- Add restrictive org-member-only policy
CREATE POLICY "campaigns_org_members_only" ON public.campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- =============================================
-- 3. FIX: organization_members - tighten write policies to prevent cross-org escalation
-- =============================================

-- Drop existing write policies
DROP POLICY IF EXISTS "members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.organization_members;

-- Recreate with proper org scoping
CREATE POLICY "members_insert_owner" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "members_update_owner" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "members_delete_owner" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  );

-- =============================================
-- 4. FIX: invitations - tighten existing policies
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "invitations_owner_only" ON public.invitations;

-- Owners can read/create invitations for their org
CREATE POLICY "invitations_owner_read_create" ON public.invitations
  FOR ALL TO authenticated
  USING (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    org_id = public.get_user_org_id()
    AND public.get_user_role() = 'owner'
  );

-- Invited users can read their own invitation by email (to accept it)
CREATE POLICY "invitations_accept_own" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    AND status = 'pending'
  );
