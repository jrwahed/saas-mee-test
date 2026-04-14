import type { Tables } from "@/integrations/supabase/types";

export const stages = [
  { id: "Fresh", label: "Fresh", color: "bg-[#06B6D4]", dotColor: "bg-[#06B6D4]" },
  { id: "Qualified", label: "Qualified", color: "bg-[#C8FF00]", dotColor: "bg-[#C8FF00]" },
  { id: "Meeting / Visit Scheduled", label: "Meeting / Visit Scheduled", color: "bg-[#3B82F6]", dotColor: "bg-[#3B82F6]" },
  { id: "Follow-up / Re-call", label: "Follow-up / Re-call", color: "bg-[#F97316]", dotColor: "bg-[#F97316]" },
  { id: "Reserved / Under Contract", label: "Reserved / Under Contract", color: "bg-[#A855F7]", dotColor: "bg-[#A855F7]" },
  { id: "Sold / Closed Won", label: "Sold / Closed Won", color: "bg-[#22C55E]", dotColor: "bg-[#22C55E]" },
  { id: "Low Budget", label: "Low Budget", color: "bg-[#9CA3AF]", dotColor: "bg-[#9CA3AF]" },
  { id: "Not Interested", label: "Not Interested", color: "bg-[#EF4444]", dotColor: "bg-[#EF4444]" },
  { id: "Postponed / Future Interest", label: "Postponed / Future Interest", color: "bg-[#EAB308]", dotColor: "bg-[#EAB308]" },
  { id: "No Answer", label: "No Answer", color: "bg-[#6B7280]", dotColor: "bg-[#6B7280]" },
  { id: "Unreachable", label: "Unreachable", color: "bg-[#DC2626]", dotColor: "bg-[#DC2626]" },
  { id: "Wrong Number / Inquiries", label: "Wrong Number / Inquiries", color: "bg-[#92400E]", dotColor: "bg-[#92400E]" },
  { id: "Junk / Trash", label: "Junk / Trash", color: "bg-[#374151]", dotColor: "bg-[#374151]" },
];

export const activePipelineStages = stages.filter(s =>
  ["Fresh", "Qualified", "Meeting / Visit Scheduled", "Follow-up / Re-call", "Reserved / Under Contract"].includes(s.id)
);
export const wonStages = stages.filter(s => s.id === "Sold / Closed Won");
export const lostInactiveStages = stages.filter(s =>
  ["Low Budget", "Not Interested", "Postponed / Future Interest", "No Answer", "Unreachable", "Wrong Number / Inquiries", "Junk / Trash"].includes(s.id)
);

export const pipelineFunnelStages = [
  "Fresh", "Qualified", "Meeting / Visit Scheduled", "Follow-up / Re-call", "Reserved / Under Contract", "Sold / Closed Won"
];

export function calcLeadScore(lead: any): number {
  let score = 0;

  // Job Title (0-35 points)
  const job = String(lead.job_title || '').toLowerCase();
  if (job.includes('ceo') || job.includes('owner') || job.includes('chairman') || job.includes('مدير عام') || job.includes('رئيس')) score += 35;
  else if (job.includes('director') || job.includes('مدير') || job.includes('manager')) score += 30;
  else if (job.includes('doctor') || job.includes('دكتور') || job.includes('engineer') || job.includes('مهندس')) score += 25;
  else if (job.includes('accountant') || job.includes('محاسب') || job.includes('lawyer') || job.includes('محامي') || job.includes('pm') || job.includes('businessman') || job.includes('business')) score += 22;
  else if (job.includes('human') || job.includes('hr') || job.includes('developer') || job.includes('موظف')) score += 18;
  else if (job.includes('اعمال حره') || job.includes('freelanc') || job.includes('حر')) score += 20;
  else if (job.trim()) score += 12;
  else score += 5;

  // Status progression (0-25 points)
  const status = String(lead.status || 'Fresh');
  if (status === 'Sold / Closed Won') score += 25;
  else if (status === 'Reserved / Under Contract') score += 22;
  else if (status === 'Meeting / Visit Scheduled') score += 20;
  else if (status === 'Follow-up / Re-call') score += 15;
  else if (status === 'Qualified') score += 12;
  else if (status === 'Fresh') score += 5;
  else score += 2;

  // Has project preference (0-15 points)
  if (lead.project && String(lead.project).trim().length > 0) score += 15;

  // Has unit type (0-10 points)
  if (lead.unit_type && String(lead.unit_type).trim().length > 0) score += 10;

  // Has phone (5 points)
  if (lead.phone && String(lead.phone).trim().length >= 10) score += 5;

  // Has name (5 points)
  if (lead.name && String(lead.name).trim().length > 2) score += 5;

  return Math.min(score, 100);
}

export function calcLeadScoreBreakdown(lead: any): { job: number; status: number; project: number; unitType: number; data: number } {
  const job_val = (() => {
    const job = String(lead.job_title || '').toLowerCase();
    if (job.includes('ceo') || job.includes('owner') || job.includes('chairman') || job.includes('مدير عام') || job.includes('رئيس')) return 35;
    if (job.includes('director') || job.includes('مدير') || job.includes('manager')) return 30;
    if (job.includes('doctor') || job.includes('دكتور') || job.includes('engineer') || job.includes('مهندس')) return 25;
    if (job.includes('accountant') || job.includes('محاسب') || job.includes('lawyer') || job.includes('محامي') || job.includes('pm') || job.includes('businessman') || job.includes('business')) return 22;
    if (job.includes('human') || job.includes('hr') || job.includes('developer') || job.includes('موظف')) return 18;
    if (job.includes('اعمال حره') || job.includes('freelanc') || job.includes('حر')) return 20;
    if (job.trim()) return 12;
    return 5;
  })();

  const status_val = (() => {
    const s = String(lead.status || 'Fresh');
    if (s === 'Sold / Closed Won') return 25;
    if (s === 'Reserved / Under Contract') return 22;
    if (s === 'Meeting / Visit Scheduled') return 20;
    if (s === 'Follow-up / Re-call') return 15;
    if (s === 'Qualified') return 12;
    if (s === 'Fresh') return 5;
    return 2;
  })();

  const project_val = (lead.project && String(lead.project).trim().length > 0) ? 15 : 0;
  const unitType_val = (lead.unit_type && String(lead.unit_type).trim().length > 0) ? 10 : 0;
  const phone_val = (lead.phone && String(lead.phone).trim().length >= 10) ? 5 : 0;
  const name_val = (lead.name && String(lead.name).trim().length > 2) ? 5 : 0;

  return { job: job_val, status: status_val, project: project_val, unitType: unitType_val, data: phone_val + name_val };
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getScoreColor(score: number) {
  if (score >= 70) return { bg: "bg-green-500/15", text: "text-green-400", label: "Hot" };
  if (score >= 40) return { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Warm" };
  return { bg: "bg-red-500/15", text: "text-red-400", label: "Cold" };
}

export type SortOption = "score" | "date" | "status";
export type ViewMode = "kanban" | "table";

export const emptyLead = {
  name: "", phone: "", project: "", source: "", assigned_to: "", notes: "", status: "Fresh",
};

