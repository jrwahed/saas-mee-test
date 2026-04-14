
-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lead',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read/update notifications for their org
CREATE POLICY "notifications_org_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "notifications_org_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- Owners can insert notifications
CREATE POLICY "notifications_org_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
