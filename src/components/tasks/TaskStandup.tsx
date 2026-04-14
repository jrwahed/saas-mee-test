import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyLogs, useTasksData, useDailySummaries } from "@/hooks/useTasksData";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MOOD_OPTIONS } from "./taskUtils";

export function TaskStandup() {
  const { orgId, user, userName, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useTasksData();
  const { data: dailyLogs = [] } = useDailyLogs();
  const { data: summaries = [] } = useDailySummaries();
  const { members } = useOrgMembers();
  const [morningPlan, setMorningPlan] = useState("");
  const [endOfDay, setEndOfDay] = useState("");
  const [mood, setMood] = useState("normal");
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const isManager = ["owner", "super_admin", "sales_manager"].includes(userRole || "");
  const today = new Date().toISOString().split("T")[0];

  const handleSubmitLog = async (logType: "morning_plan" | "end_of_day") => {
    if (!orgId || !user?.email) return;
    const content = logType === "morning_plan" ? morningPlan : endOfDay;
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("task_logs").insert({
      org_id: orgId, user_email: user.email, user_name: userName || "",
      log_type: logType, content: content.trim(),
      hours_spent: logType === "end_of_day" && hours ? Number(hours) : 0,
      mood: logType === "end_of_day" ? mood : null,
    });
    if (error) toast.error("Error submitting log");
    else {
      toast.success(logType === "morning_plan" ? "Morning plan saved" : "End of day log saved");
      if (logType === "morning_plan") setMorningPlan(""); else { setEndOfDay(""); setHours(""); }
      queryClient.invalidateQueries({ queryKey: ["task_logs_daily"] });
    }
    setSaving(false);
  };

  const handleAiReview = async (email: string) => {
    if (!orgId) return;
    setAiLoading(true);
    try {
      const userTasks = tasks.filter(t => t.assigned_to === email);
      const userLogs = dailyLogs.filter(l => l.user_email === email);
      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: { type: "daily_summary", data: { tasks: userTasks, logs: userLogs, email, date: today } },
      });
      if (error) throw error;
      const content = data?.report || "";
      let score: number | null = null;
      let summary = content;
      let recommendations: string | null = null;
      try {
        const parsed = JSON.parse(content);
        score = parsed.score || null;
        summary = parsed.summary || content;
        recommendations = parsed.recommendations || null;
      } catch { /* use raw content */ }
      await supabase.from("daily_summaries").upsert({
        org_id: orgId, user_email: email, summary_date: today,
        tasks_completed: userTasks.filter(t => t.status === "completed").length,
        tasks_in_progress: userTasks.filter(t => t.status === "in_progress").length,
        total_hours: userLogs.reduce((s, l) => s + (Number(l.hours_spent) || 0), 0),
        productivity_score: score, ai_summary: summary, ai_recommendations: recommendations,
      }, { onConflict: "org_id,user_email,summary_date" });
      queryClient.invalidateQueries({ queryKey: ["daily_summaries"] });
      toast.success("AI review generated");
    } catch (e: any) {
      // AI Review Error Note:
      // If you see \"Edge Function returned a non-2xx status code\", it means:
      // 1. The Edge Function 'task-ai-analyze' is not deployed to your Supabase project, OR
      // 2. The secret 'AI_GATEWAY_API_KEY' is not configured in Supabase Dashboard.
      //
      // To fix:
      // - Deploy the function: supabase functions deploy task-ai-analyze
      // - In Supabase Dashboard: Settings → Edge Functions → Secrets
      //   Add secret: AI_GATEWAY_API_KEY with your AI gateway API key value
      // - Redeploy if needed: supabase functions deploy task-ai-analyze
      toast.error(e.message || "AI review failed");
    }
    setAiLoading(false);
  };

  const mySummary = summaries.find(s => s.user_email === user?.email);

  return (
    <div className="space-y-6">
      {/* Current user card */}
      <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
            {(userName || "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{userName || user?.email}</p>
            <p className="text-[10px] text-primary capitalize">{userRole || "Member"} — You</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Morning Plan</label>
          <textarea value={morningPlan} onChange={e => setMorningPlan(e.target.value)} rows={2} placeholder="What do you plan to accomplish today?"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <Button size="sm" onClick={() => handleSubmitLog("morning_plan")} disabled={saving || !morningPlan.trim()} className="mt-1 text-xs">Save Morning Plan</Button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">End of Day</label>
          <textarea value={endOfDay} onChange={e => setEndOfDay(e.target.value)} rows={2} placeholder="What did you accomplish today?"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <div className="flex items-center gap-3 mt-2">
            <div className="flex gap-1.5">
              {MOOD_OPTIONS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  className={cn("text-lg p-1 rounded-lg transition-all", mood === m.value ? "bg-primary/20 scale-110" : "opacity-50 hover:opacity-100")} title={m.label}>
                  {m.emoji}
                </button>
              ))}
            </div>
            <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours" step="0.5"
              className="w-20 h-8 bg-secondary border border-border rounded-lg px-2 text-sm text-foreground text-center" />
            <Button size="sm" onClick={() => handleSubmitLog("end_of_day")} disabled={saving || !endOfDay.trim()} className="text-xs">Save</Button>
          </div>
        </div>

        {mySummary?.productivity_score != null && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${((mySummary.productivity_score || 0) / 100) * 264} 264`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{mySummary.productivity_score}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {mySummary.ai_summary && <p className="text-xs text-foreground mb-1" dir="rtl">{mySummary.ai_summary}</p>}
              {mySummary.ai_recommendations && <p className="text-[10px] text-muted-foreground" dir="rtl">{mySummary.ai_recommendations}</p>}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => handleAiReview(user?.email || "")} disabled={aiLoading} className="w-full gap-2 text-xs">
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          Generate AI Review
        </Button>
      </div>

      {/* Other team members (managers only) */}
      {isManager && members.filter(m => m.email !== user?.email).map(member => {
        const memberLogs = dailyLogs.filter(l => l.user_email === member.email);
        const memberSummary = summaries.find(s => s.user_email === member.email);
        return (
          <div key={member.email} className="bg-card border border-border/50 rounded-xl p-5 space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                  {member.display_name?.slice(0, 2).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.display_name || member.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                </div>
              </div>
              {memberSummary?.productivity_score != null && (
                <span className="text-lg font-bold text-primary">{memberSummary.productivity_score}</span>
              )}
            </div>
            {memberLogs.length > 0 ? (
              <div className="space-y-2">
                {memberLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="bg-secondary/30 rounded-lg p-2">
                    <span className="text-[10px] font-semibold text-primary uppercase">{log.log_type?.replace("_", " ")}</span>
                    <p className="text-xs text-muted-foreground">{log.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground text-center py-2">No logs today</p>}
            <Button variant="ghost" size="sm" onClick={() => handleAiReview(member.email)} disabled={aiLoading} className="w-full gap-2 text-xs">
              <Brain className="h-3 w-3" /> AI Review
            </Button>
          </div>
        );
      })}
    </div>
  );
}
