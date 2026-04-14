import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksData, useDailySummaries } from "@/hooks/useTasksData";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TaskPerformance() {
  const { orgId, userRole } = useAuth();
  const { data: tasks = [], isLoading } = useTasksData();
  const { data: summaries = [] } = useDailySummaries();
  const { members } = useOrgMembers();
  const [aiLoading, setAiLoading] = useState(false);
  const [teamReport, setTeamReport] = useState("");

  const leaderboard = useMemo(() => {
    const stats: Record<string, { name: string; completed: number; inProgress: number; totalHours: number; score: number | null }> = {};
    members.forEach(m => {
      stats[m.email] = { name: m.display_name || m.email, completed: 0, inProgress: 0, totalHours: 0, score: null };
    });
    tasks.forEach(t => {
      if (!t.assigned_to || !stats[t.assigned_to]) return;
      if (t.status === "completed") stats[t.assigned_to].completed++;
      if (t.status === "in_progress") stats[t.assigned_to].inProgress++;
      stats[t.assigned_to].totalHours += Number(t.actual_hours) || 0;
    });
    summaries.forEach(s => {
      if (stats[s.user_email] && s.productivity_score != null) stats[s.user_email].score = s.productivity_score;
    });
    return Object.entries(stats)
      .map(([email, d]) => ({ email, ...d }))
      .filter(r => r.completed > 0 || r.inProgress > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0) || b.completed - a.completed);
  }, [tasks, summaries, members]);

  const handleTeamReport = async () => {
    if (!orgId) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: { type: "team_overview", data: { leaderboard, totalTasks: tasks.length } },
      });
      if (error) throw error;
      setTeamReport(data?.report || "");
      toast.success("Team report generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    }
    setAiLoading(false);
  };

  const rankBorder = (i: number) =>
    i === 0 ? "border-l-yellow-400" : i === 1 ? "border-l-gray-300" : i === 2 ? "border-l-orange-400" : "border-l-border";

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Team Leaderboard</h3>
        {["owner", "super_admin", "sales_manager"].includes(userRole || "") && (
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleTeamReport} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Generate Team Report
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {leaderboard.map((rep, i) => (
          <div key={rep.email} className={cn("bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 border-l-4 animate-fade-in-up", rankBorder(i))}>
            <div className="text-lg font-bold text-muted-foreground w-8 text-center">#{i + 1}</div>
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
              {rep.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{rep.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{rep.completed} completed</span>
                <span className="text-[10px] text-muted-foreground">{rep.inProgress} in progress</span>
              </div>
            </div>
            {rep.score != null && (
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={rep.score >= 70 ? "hsl(142 71% 45%)" : rep.score >= 40 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"}
                    strokeWidth="8" strokeDasharray={`${(rep.score / 100) * 264} 264`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{rep.score}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {leaderboard.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No task data yet. Assign tasks to see performance.</p>}
      </div>

      {teamReport && (
        <div className="bg-card border border-primary/20 rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">AI Team Report</h4>
          </div>
          <div className="space-y-2">
            {teamReport.split("\n").filter(l => l.trim()).map((line, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed" dir="rtl">{line.replace(/^\d+[\.\-\)]\s*/, "")}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
