import type { Tables } from "@/integrations/supabase/types";

/* ── Job Title Tiers ── */
const TIER1 = ["ceo", "owner", "chairman", "مدير عام", "رئيس مجلس إدارة", "managing director", "رئيس مجلس الادارة"];
const TIER2 = ["doctor", "engineer", "مهندس", "دكتور", "lawyer", "محامي", "pharmacist", "صيدلي", "judge", "قاضي", "professor", "أستاذ جامعي", "consultant", "استشاري", "dr", "eng"];
const TIER3 = ["manager", "مدير", "director", "accountant", "محاسب", "team lead", "supervisor", "مشرف"];

function jobTitleScore(title: string | null | undefined): number {
  if (!title) return 10;
  const lower = title.toLowerCase().trim();
  if (TIER1.some(t => lower.includes(t))) return 50;
  if (TIER2.some(t => lower.includes(t))) return 35;
  if (TIER3.some(t => lower.includes(t))) return 25;
  return 10;
}

function statusScore(status: string | null): number {
  switch (status) {
    case "Reserved / Under Contract": return 30;
    case "Meeting / Visit Scheduled": return 25;
    case "Follow-up / Re-call": return 20;
    case "Qualified": return 10;
    case "No Answer": return 5;
    default: return 5;
  }
}

function engagementScore(lead: Tables<"leads">, commentCount?: number): number {
  let score = 0;
  if (commentCount && commentCount > 0) score += 10;
  if (lead.status && lead.status !== "Qualified") score += 5;
  if (lead.created_at) {
    const daysAgo = (Date.now() - new Date(lead.created_at).getTime()) / 86400000;
    if (daysAgo <= 7) score += 5;
  }
  return Math.min(score, 20);
}

export interface LeadScoreBreakdown {
  jobTitle: number;
  status: number;
  engagement: number;
  total: number;
  grade: string;
  gradeColor: string;
}

export function calcAILeadScore(
  lead: Tables<"leads">,
  jobTitle?: string | null,
  commentCount?: number
): LeadScoreBreakdown {
  const jt = jobTitleScore(jobTitle);
  const st = statusScore(lead.status);
  const en = engagementScore(lead, commentCount);
  const total = jt + st + en;

  let grade = "D";
  let gradeColor = "bg-destructive/15 text-destructive";
  if (total >= 80) { grade = "A+"; gradeColor = "bg-success/15 text-success"; }
  else if (total >= 60) { grade = "A"; gradeColor = "bg-primary/15 text-primary"; }
  else if (total >= 40) { grade = "B"; gradeColor = "bg-warning/15 text-warning"; }
  else if (total >= 20) { grade = "C"; gradeColor = "bg-orange-500/15 text-orange-400"; }

  return { jobTitle: jt, status: st, engagement: en, total, grade, gradeColor };
}
