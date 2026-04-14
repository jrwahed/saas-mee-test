
-- Add new columns to notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS link text;

-- Create assignment_log table
CREATE TABLE IF NOT EXISTS public.assignment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id),
  from_rep text DEFAULT '',
  to_rep text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on assignment_log
ALTER TABLE public.assignment_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for assignment_log
CREATE POLICY "assignment_log_org_only"
  ON public.assignment_log
  FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());
