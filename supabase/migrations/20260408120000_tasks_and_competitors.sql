-- =============================================
-- MW Growth Systems: Tasks + Competitive Intelligence
-- =============================================

-- 1. tasks — core task table (receives data from n8n webhook)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'review', 'completed', 'blocked', 'cancelled')),
  category text,
  assigned_to text,
  assigned_by text,
  auto_assigned boolean DEFAULT false,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours numeric(5,2),
  actual_hours numeric(5,2),
  source text DEFAULT 'manual',
  source_ref text,
  tags text[],
  ai_score integer,
  ai_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. task_logs — daily standup / activity log per team member
CREATE TABLE public.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  log_type text DEFAULT 'update' CHECK (log_type IN ('morning_plan', 'update', 'end_of_day', 'blocker', 'note')),
  content text NOT NULL,
  hours_spent numeric(5,2) DEFAULT 0,
  mood text CHECK (mood IN ('productive', 'normal', 'struggling', 'blocked')),
  created_at timestamptz DEFAULT now()
);

-- 3. task_assignment_rules — auto-distribution logic
CREATE TABLE public.task_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  categories text[],
  max_concurrent_tasks integer DEFAULT 5,
  skill_level integer DEFAULT 3 CHECK (skill_level BETWEEN 1 AND 5),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. daily_summaries — AI-generated daily performance summaries
CREATE TABLE public.daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  summary_date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  tasks_in_progress integer DEFAULT 0,
  total_hours numeric(5,2) DEFAULT 0,
  productivity_score integer,
  ai_summary text,
  ai_recommendations text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_email, summary_date)
);

-- 5. competitors — tracked competitor profiles
CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  website text,
  logo_url text,
  industry text,
  description text,
  social_links jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. competitor_intel — intelligence data points (fed by n8n)
CREATE TABLE public.competitor_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  competitor_id uuid REFERENCES public.competitors(id) ON DELETE CASCADE NOT NULL,
  intel_type text NOT NULL CHECK (intel_type IN (
    'ad_spend', 'social_followers', 'social_engagement', 'new_campaign',
    'pricing_change', 'new_product', 'hiring', 'review_score',
    'website_traffic', 'seo_ranking', 'content_published', 'news', 'custom'
  )),
  title text NOT NULL,
  value numeric,
  previous_value numeric,
  unit text,
  details jsonb,
  source text,
  source_url text,
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 7. competitor_reports — AI-generated strategic reports
CREATE TABLE public.competitor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  report_type text DEFAULT 'weekly' CHECK (report_type IN ('weekly', 'monthly', 'flash', 'battle_plan')),
  title text NOT NULL,
  content text NOT NULL,
  ai_threat_level text CHECK (ai_threat_level IN ('critical', 'high', 'medium', 'low')),
  ai_opportunities jsonb,
  ai_recommendations jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8. market_benchmarks — industry benchmark data
CREATE TABLE public.market_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  industry text,
  region text DEFAULT 'egypt',
  period text,
  source text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;

-- Helper: get user org
CREATE OR REPLACE FUNCTION public.get_user_org_id_safe()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- tasks policies
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- task_logs policies
CREATE POLICY "task_logs_select" ON public.task_logs FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_logs_insert" ON public.task_logs FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_logs_update" ON public.task_logs FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_logs_delete" ON public.task_logs FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- task_assignment_rules policies
CREATE POLICY "task_rules_select" ON public.task_assignment_rules FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_rules_insert" ON public.task_assignment_rules FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_rules_update" ON public.task_assignment_rules FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "task_rules_delete" ON public.task_assignment_rules FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- daily_summaries policies
CREATE POLICY "daily_summaries_select" ON public.daily_summaries FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "daily_summaries_insert" ON public.daily_summaries FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "daily_summaries_update" ON public.daily_summaries FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- competitors policies
CREATE POLICY "competitors_select" ON public.competitors FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "competitors_insert" ON public.competitors FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "competitors_update" ON public.competitors FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "competitors_delete" ON public.competitors FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- competitor_intel policies
CREATE POLICY "intel_select" ON public.competitor_intel FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "intel_insert" ON public.competitor_intel FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "intel_update" ON public.competitor_intel FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "intel_delete" ON public.competitor_intel FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- competitor_reports policies
CREATE POLICY "comp_reports_select" ON public.competitor_reports FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "comp_reports_insert" ON public.competitor_reports FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "comp_reports_update" ON public.competitor_reports FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());

-- market_benchmarks policies
CREATE POLICY "benchmarks_select" ON public.market_benchmarks FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id_safe());
CREATE POLICY "benchmarks_insert" ON public.market_benchmarks FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id_safe());
CREATE POLICY "benchmarks_update" ON public.market_benchmarks FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id_safe());
