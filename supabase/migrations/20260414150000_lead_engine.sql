-- Lead Engine Tables Migration
-- Created for MW Growth Systems - Lead Generation System

-- 1) جدول الشركات المستهدفة (Prospects)
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL, -- 'fmcg' | 'telecom' | 'banking' | 'real_estate' | 'auto' | 'education' | 'other'
  size TEXT, -- 'small' | 'medium' | 'large'
  website TEXT,
  social_links JSONB DEFAULT '{}',
  marketing_activity TEXT,
  reason_for_selection TEXT,
  ai_priority_score INTEGER DEFAULT 0 CHECK (ai_priority_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'prospect', -- 'prospect' | 'researched' | 'contacted' | 'converted'
  created_by TEXT,
  converted_lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) جدول تحليل الشركة (Research)
CREATE TABLE IF NOT EXISTS prospect_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  company_summary TEXT,
  marketing_behavior TEXT,
  opportunity_insight TEXT,
  suggested_event_idea TEXT,
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) جدول أصحاب القرار (Decision Makers)
CREATE TABLE IF NOT EXISTS decision_makers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  name TEXT,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  personal_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) جدول رسائل التواصل (Outreach)
CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  decision_maker_id UUID REFERENCES decision_makers(id),
  observation TEXT,      -- الملاحظة الحقيقية (Step 1)
  opportunity TEXT,      -- الفرصة أو المشكلة (Step 2)
  idea TEXT,             -- الفكرة القصيرة (Step 3)
  call_to_action TEXT,   -- الدعوة البسيطة (Step 4)
  full_message TEXT,     -- الرسالة الكاملة المجمّعة
  language TEXT DEFAULT 'ar',
  status TEXT DEFAULT 'draft', -- 'draft' | 'sent' | 'replied' | 'no_reply'
  sent_at TIMESTAMPTZ,
  follow_up_day_4 TIMESTAMPTZ,
  follow_up_day_8 TIMESTAMPTZ,
  follow_up_day_14 TIMESTAMPTZ,
  follow_up_4_done BOOLEAN DEFAULT false,
  follow_up_8_done BOOLEAN DEFAULT false,
  follow_up_14_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_org_id ON prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_sector ON prospects(sector);
CREATE INDEX IF NOT EXISTS idx_research_prospect_id ON prospect_research(prospect_id);
CREATE INDEX IF NOT EXISTS idx_dm_prospect_id ON decision_makers(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_prospect_id ON outreach_messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_messages(status);

-- RLS على الجداول الأربعة (نفس نمط باقي الجداول):
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_prospects" ON prospects;
CREATE POLICY "org_access_prospects" ON prospects
  USING (org_id = get_user_org_id_safe());

ALTER TABLE prospect_research ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_research" ON prospect_research;
CREATE POLICY "org_access_research" ON prospect_research
  USING (org_id = get_user_org_id_safe());

ALTER TABLE decision_makers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_dm" ON decision_makers;
CREATE POLICY "org_access_dm" ON decision_makers
  USING (org_id = get_user_org_id_safe());

ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_outreach" ON outreach_messages;
CREATE POLICY "org_access_outreach" ON outreach_messages
  USING (org_id = get_user_org_id_safe());
