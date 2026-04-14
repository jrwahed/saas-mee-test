import { useMemo, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLeadsData } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { GitBranch, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtNum, fmtPct } from "@/lib/formatters";
import { pipelineFunnelStages } from "@/components/crm/crmUtils";
import { getStatusStyle } from "@/lib/statusStyles";

const stageColors: Record<string, string> = {
  "Fresh": "bg-[#06B6D4]",
  "Qualified": "bg-[#C8FF00]",
  "Meeting / Visit Scheduled": "bg-[#3B82F6]",
  "Follow-up / Re-call": "bg-[#F97316]",
  "Reserved / Under Contract": "bg-[#A855F7]",
  "Sold / Closed Won": "bg-[#22C55E]",
};

/* ── Animated progress ring ── */
function ProgressRing({ value, size = 48, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setAnimated(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(animated, 100)) / 100;
  const color = value > 20 ? "hsl(var(--success))" : value >= 10 ? "hsl(var(--warning))" : value > 0 ? "hsl(var(--destructive))" : "hsl(var(--muted))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-100" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-foreground">{animated}%</span>
      </div>
    </div>
  );
}

/* ── Overall gauge ── */
function OverallGauge({ value }: { value: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1500, 1);
      setAnimated((1 - Math.pow(1 - p, 3)) * value);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const angle = (animated / 100) * 180 - 90;
  const color = value >= 15 ? "hsl(var(--success))" : value >= 5 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-24 overflow-hidden">
        <svg viewBox="0 0 160 90" className="w-full h-full">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
          {/* Red zone */}
          <path d="M 10 80 A 70 70 0 0 1 43 22" fill="none" stroke="hsl(var(--destructive) / 0.3)" strokeWidth="10" strokeLinecap="round" />
          {/* Yellow zone */}
          <path d="M 43 22 A 70 70 0 0 1 117 22" fill="none" stroke="hsl(var(--warning) / 0.3)" strokeWidth="10" strokeLinecap="round" />
          {/* Green zone */}
          <path d="M 117 22 A 70 70 0 0 1 150 80" fill="none" stroke="hsl(var(--success) / 0.3)" strokeWidth="10" strokeLinecap="round" />
          {/* Needle */}
          <line x1="80" y1="80" x2={80 + 55 * Math.cos((angle * Math.PI) / 180)} y2={80 + 55 * Math.sin((angle * Math.PI) / 180)}
            stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="80" r="5" fill={color} />
        </svg>
      </div>
      <p className="text-2xl font-bold text-foreground">{fmtPct(value)}</p>
      <p className="text-xs text-muted-foreground">Overall Close Rate</p>
    </div>
  );
}

const SalesPipeline = () => {
  const { data: leads = [], isLoading, error, refetch } = useLeadsData({ forCRM: true });
  const { orgId } = useAuth();
  useRealtimeSubscription("leads", ["leads"], "pipeline-leads-rt");

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { const s = l.status || "Fresh"; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [leads]);

  const closedCount = stageCounts["Sold / Closed Won"] || 0;

  const conversions = useMemo(() => {
    const result: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < pipelineFunnelStages.length - 1; i++) {
      const fromCount = stageCounts[pipelineFunnelStages[i]] || 0;
      const toCount = stageCounts[pipelineFunnelStages[i + 1]] || 0;
      result.push({ from: pipelineFunnelStages[i], to: pipelineFunnelStages[i + 1], rate: fromCount > 0 ? (toCount / fromCount) * 100 : 0 });
    }
    const overallRate = leads.length > 0 ? (closedCount / leads.length) * 100 : 0;
    return { stages: result, overall: overallRate };
  }, [stageCounts, leads.length, closedCount]);

  const performers = useMemo(() => {
    const reps: Record<string, { total: number; fresh: number; qualified: number; meeting: number; followup: number; reserved: number; sold: number; notInterested: number; noAnswer: number }> = {};
    leads.forEach(l => {
      const rep = l.assigned_to;
      if (!rep) return;
      if (!reps[rep]) reps[rep] = { total: 0, fresh: 0, qualified: 0, meeting: 0, followup: 0, reserved: 0, sold: 0, notInterested: 0, noAnswer: 0 };
      reps[rep].total++;
      if (l.status === "Fresh") reps[rep].fresh++;
      if (l.status === "Qualified") reps[rep].qualified++;
      if (l.status === "Meeting / Visit Scheduled") reps[rep].meeting++;
      if (l.status === "Follow-up / Re-call") reps[rep].followup++;
      if (l.status === "Reserved / Under Contract") reps[rep].reserved++;
      if (l.status === "Sold / Closed Won") reps[rep].sold++;
      if (l.status === "Not Interested") reps[rep].notInterested++;
      if (l.status === "No Answer") reps[rep].noAnswer++;
    });
    return Object.entries(reps)
      .map(([name, d]) => ({ name, ...d, rate: d.total > 0 ? (d.sold / d.total) * 100 : 0 }))
      .sort((a, b) => b.sold - a.sold);
  }, [leads]);

  // Totals for footer row
  const totals = useMemo(() => {
    return performers.reduce((acc, p) => ({
      total: acc.total + p.total, fresh: acc.fresh + p.fresh, qualified: acc.qualified + p.qualified,
      meeting: acc.meeting + p.meeting, followup: acc.followup + p.followup,
      reserved: acc.reserved + p.reserved, sold: acc.sold + p.sold,
      notInterested: acc.notInterested + p.notInterested, noAnswer: acc.noAnswer + p.noAnswer,
    }), { total: 0, fresh: 0, qualified: 0, meeting: 0, followup: 0, reserved: 0, sold: 0, notInterested: 0, noAnswer: 0 });
  }, [performers]);

  if (!orgId) {
    return (
      <DashboardLayout title="Sales Pipeline" subtitle="Visual pipeline funnel">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Sales Pipeline" subtitle="Visual pipeline funnel">
        <ErrorState message="Error loading pipeline data" onRetry={refetch} />
      </DashboardLayout>
    );
  }

  const maxCount = Math.max(...pipelineFunnelStages.map(s => stageCounts[s] || 0), 1);

  function ratingBadge(rate: number) {
    if (rate > 3) return <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full"><Star className="h-3 w-3" />ممتاز</span>;
    if (rate >= 1) return <span className="text-[11px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full">جيد</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" />ضعيف</span>;
  }

  return (
    <DashboardLayout title="Sales Pipeline" subtitle="Visual pipeline funnel">
      <div className="page-fade-in space-y-8">
        {/* Pipeline Funnel */}
        <div className="bg-card border border-border rounded-xl p-6 card-glow">
          <h3 className="section-header mb-5">Pipeline Funnel</h3>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="h-10 w-10 text-muted-foreground/40 status-dot-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">No pipeline data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineFunnelStages.map((stage) => {
                const count = stageCounts[stage] || 0;
                const pctVal = leads.length > 0 ? (count / leads.length) * 100 : 0;
                const barWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;
                return (
                  <div key={stage} className="flex items-center gap-4">
                    <span className="text-sm text-foreground w-44 text-right shrink-0 font-medium">{stage}</span>
                    <div className="flex-1">
                      <div className="h-10 bg-secondary/30 rounded-lg overflow-hidden relative">
                        <div className={cn("h-full rounded-lg flex items-center px-3 transition-all duration-700", stageColors[stage])} style={{ width: `${barWidth}%` }}>
                          <span className="text-xs font-bold text-background">{fmtNum(count)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono w-14 shrink-0">{fmtPct(pctVal)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Conversion Rates */}
        <div className="bg-card border border-border rounded-xl p-6 card-glow">
          <h3 className="section-header mb-6">Conversion Rates</h3>
          <div className="space-y-6">
            {conversions.stages.map((c, i) => (
              <div key={`${c.from}-${c.to}`} className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 200}ms` }}>
                <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0", getStatusStyle(c.from))}>{c.from}</span>
                <div className="flex flex-col items-center gap-1">
                  <div className={cn("text-primary transition-all", c.rate > 0 ? "animate-pulse" : "opacity-30")}>→</div>
                </div>
                <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0", getStatusStyle(c.to))}>{c.to}</span>
                <div className="ml-auto">
                  <ProgressRing value={Math.round(c.rate)} />
                </div>
              </div>
            ))}
          </div>

          {/* Overall gauge */}
          <div className="mt-8 pt-6 border-t border-border/30 flex justify-center">
            <OverallGauge value={conversions.overall} />
          </div>
        </div>

        {/* Enhanced Top Performers */}
        <div className="border border-border rounded-xl overflow-hidden bg-card card-glow">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="section-header">Top Performers</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sales Rep</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Total</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Fresh</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Qualified</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Meeting</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Follow-up</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Reserved</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Sold</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Not Int.</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">No Answer</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Conv %</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : performers.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">No pipeline data yet</TableCell></TableRow>
                ) : (
                  <>
                    {performers.map((p, i) => (
                      <TableRow key={p.name} className="hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-primary">
                              {p.name.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground text-sm">{p.name}</span>
                            {i === 0 && performers.length > 1 && (
                              <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">Top</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-foreground text-center">{fmtNum(p.total)}</TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Fresh"))}>{p.fresh}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Qualified"))}>{p.qualified}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Meeting / Visit Scheduled"))}>{p.meeting}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Follow-up / Re-call"))}>{p.followup}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Reserved / Under Contract"))}>{p.reserved}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Sold / Closed Won"))}>{p.sold}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Not Interested"))}>{p.notInterested}</span></TableCell>
                        <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("No Answer"))}>{p.noAnswer}</span></TableCell>
                        <TableCell className="text-center">
                          <span className={cn("text-sm font-mono font-bold", p.rate >= 3 ? "text-success" : p.rate >= 1 ? "text-warning" : "text-destructive")}>
                            {fmtPct(p.rate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{ratingBadge(p.rate)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-secondary/20 border-t-2 border-primary/20 hover:bg-secondary/20">
                      <TableCell className="font-bold text-primary text-sm">الإجمالي</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{fmtNum(totals.total)}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.fresh}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.qualified}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.meeting}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.followup}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.reserved}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.sold}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.notInterested}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.noAnswer}</TableCell>
                      <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.total > 0 ? fmtPct((totals.sold / totals.total) * 100) : "0%"}</TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalesPipeline;
