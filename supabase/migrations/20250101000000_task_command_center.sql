-- Task Command Center Tables Migration
-- Creates tables for daily standups, weekly goals, and standup files

-- 1) Daily Standups Table
CREATE TABLE IF NOT EXISTS daily_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week_start DATE NOT NULL,
  morning_plan TEXT,
  end_of_day TEXT,
  mood TEXT,
  hours_logged NUMERIC DEFAULT 0,
  ai_review JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one standup per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_standups_unique 
ON daily_standups(org_id, user_id, date);

-- Index for week-based queries
CREATE INDEX IF NOT EXISTS idx_daily_standups_week 
ON daily_standups(org_id, user_id, week_start);

-- 2) Weekly Goals Table
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one goals record per user per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_goals_unique 
ON weekly_goals(org_id, user_id, week_start);

-- 3) Standup Files Table
CREATE TABLE IF NOT EXISTS standup_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day DATE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for week-based queries
CREATE INDEX IF NOT EXISTS idx_standup_files_week 
ON standup_files(org_id, user_id, week_start);

-- Index for day-based queries
CREATE INDEX IF NOT EXISTS idx_standup_files_day 
ON standup_files(org_id, user_id, day);

-- Enable Row Level Security
ALTER TABLE daily_standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE standup_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_standups
CREATE POLICY "Users can view their own standups"
ON daily_standups FOR SELECT
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own standups"
ON daily_standups FOR INSERT
WITH CHECK (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own standups"
ON daily_standups FOR UPDATE
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can delete their own standups"
ON daily_standups FOR DELETE
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

-- RLS Policies for weekly_goals
CREATE POLICY "Users can view their own goals"
ON weekly_goals FOR SELECT
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own goals"
ON weekly_goals FOR INSERT
WITH CHECK (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own goals"
ON weekly_goals FOR UPDATE
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can delete their own goals"
ON weekly_goals FOR DELETE
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

-- RLS Policies for standup_files
CREATE POLICY "Users can view their own files"
ON standup_files FOR SELECT
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own files"
ON standup_files FOR INSERT
WITH CHECK (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

CREATE POLICY "Users can delete their own files"
ON standup_files FOR DELETE
USING (
  org_id = get_user_org_id_safe() AND
  user_id = auth.uid()
);

-- Add comments for documentation
COMMENT ON TABLE daily_standups IS 'Daily standup entries for task command center';
COMMENT ON TABLE weekly_goals IS 'Weekly goals tracking for task command center';
COMMENT ON TABLE standup_files IS 'File attachments for daily standups';

COMMENT ON COLUMN daily_standups.morning_plan IS 'Plan for the day written in the morning';
COMMENT ON COLUMN daily_standups.end_of_day IS 'Summary of what was accomplished';
COMMENT ON COLUMN daily_standups.mood IS 'User mood: happy, ok, stressed, blocked';
COMMENT ON COLUMN daily_standups.ai_review IS 'JSON with productivity_score, summary, recommendations';

COMMENT ON COLUMN weekly_goals.goals IS 'Array of goal objects: {title, status, priority, expected_hours, actual_hours}';
