import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageAIBanner } from "@/components/PageAIBanner";
import { Trophy, Users, TrendingUp, Target, Star, AlertTriangle } from "lucide-react";
import { useLeadsData } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtNum } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getStatusStyle } from "@/lib/statusStyles";

interface RepData {
  name: string;
  initials: string;
  total: number;
  qualified: number;
  meeting: number;
  followup: number;
  reserved: number;
  sold: number;
  notInterested: number;
  noAnswer: number;
  convRate: number;
}


function ratingBadge(rate: number) {
  if (rate > 3) return <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full"><Star className="h-3 w-3" />ممتاز</span>;
  if (rate >= 1) return <span className="text-[11px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full">جيد</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" />ضعيف</span>;
}

const Sales = () => {
  const { data: leads = [], isLoading, error, refetch } = useLeadsData({ forCRM: true });
  useRealtimeSubscription("leads", ["leads"], "sales-leads-rt");

  const reps: RepData[] = useMemo(() => {
    const grouped: Record<string, { total: number; qualified: number; meeting: number; followup: number; reserved: number; sold: number; notInterested: number; noAnswer: number }> = {};
    leads.forEach((l) => {
      const name = l.assigned_to?.trim();
      if (!name) return;
      if (!grouped[name]) grouped[name] = { total: 0, qualified: 0, meeting: 0, followup: 0, reserved: 0, sold: 0, notInterested: 0, noAnswer: 0 };
      grouped[name].total++;
      if (l.status === "Qualified") grouped[name].qualified++;
      if (l.status === "Meeting / Visit Scheduled") grouped[name].meeting++;
      if (l.status === "Follow-up / Re-call") grouped[name].followup++;
      if (l.status === "Reserved / Under Contract") grouped[name].reserved++;
      if (l.status === "Sold / Closed Won") grouped[name].sold++;
      if (l.status === "Not Interested") grouped[name].notInterested++;
      if (l.status === "No Answer") grouped[name].noAnswer++;
    });

    return Object.entries(grouped)
      .map(([name, d]) => ({
        name,
        initials: name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        ...d,
        convRate: d.total > 0 ? (d.sold / d.total) * 100 : 0,
      }))
      .sort((a, b) => b.sold - a.sold);
  }, [leads]);

  const totals = useMemo(() => {
    return reps.reduce((acc, p) => ({
      total: acc.total + p.total, qualified: acc.qualified + p.qualified,
      meeting: acc.meeting + p.meeting, followup: acc.followup + p.followup,
      reserved: acc.reserved + p.reserved, sold: acc.sold + p.sold,
      notInterested: acc.notInterested + p.notInterested, noAnswer: acc.noAnswer + p.noAnswer,
    }), { total: 0, qualified: 0, meeting: 0, followup: 0, reserved: 0, sold: 0, notInterested: 0, noAnswer: 0 });
  }, [reps]);

  if (error) {
    return (
      <DashboardLayout title="Sales" subtitle="Sales team performance">
        <ErrorState message="Error loading sales data" onRetry={refetch} />
      </DashboardLayout>
    );
  }

  const top3 = reps.slice(0, 3);
  const podiumOrder = [1, 0, 2];
  const podiumHeights = ["h-28", "h-36", "h-24"];
  const medals = ["text-slate-400", "text-yellow-400", "text-orange-400"];

  return (
    <DashboardLayout title="Sales" subtitle="Sales team performance">
      <div className="page-fade-in">
        <PageAIBanner page="sales" />
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary status-dot-pulse" />
            <span className="text-xs text-primary font-medium">Live</span>
            <span className="text-xs text-muted-foreground">— Updates in real-time</span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-end justify-center gap-6 py-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ) : reps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
              <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-muted-foreground/40 status-dot-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            </div>
          ) : (
            <>
              {/* Podium */}
              {top3.length > 0 && (
                <div className="hidden sm:flex items-end justify-center gap-4 py-6">
                  {podiumOrder.map((idx, posIdx) => {
                    const rep = top3[idx];
                    if (!rep) return <div key={posIdx} className="w-28" />;
                    const rank = idx + 1;
                    const isFirst = rank === 1;
                    return (
                      <div key={rep.name} className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: `${posIdx * 150}ms` }}>
                        <Trophy className={`h-6 w-6 mb-1 ${medals[posIdx]}`} />
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${isFirst ? "bg-primary/20 border-2 border-primary text-primary" : "bg-secondary border border-border text-foreground"}`}>
                          {rep.initials}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{rep.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtNum(rep.sold)} deals</p>
                        <div className={`mt-2 w-20 ${podiumHeights[posIdx]} rounded-t-lg ${isFirst ? "bg-primary/20 border-t-2 border-x-2 border-primary" : "bg-secondary border-t border-x border-border"} flex items-center justify-center`}>
                          <span className={`text-2xl font-bold ${isFirst ? "text-primary" : "text-muted-foreground"}`}>#{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rep Cards */}
              <h3 className="section-header">Rep Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                {reps.map((rep, i) => (
                  <Card key={rep.name} className="border-border bg-card overflow-hidden card-glow animate-fade-in-up" style={{ borderLeft: `3px solid ${i === 0 ? 'hsl(271 81% 56%)' : i === 1 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)'}` }}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primary/20 text-primary border border-primary" : "bg-secondary text-foreground"}`}>
                          {rep.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{rep.name}</p>
                          <p className="text-xs text-muted-foreground">#{i + 1} Rank</p>
                        </div>
                        {i < 3 && <Trophy className={`h-4 w-4 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-400" : "text-orange-400"}`} />}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Leads</p>
                            <p className="text-sm font-bold text-foreground font-mono">{fmtNum(rep.total)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Deals</p>
                            <p className="text-sm font-bold text-primary font-mono">{fmtNum(rep.sold)}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Conversion Rate</span>
                          <span>{rep.convRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(rep.convRate, 100)} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Enhanced Leaderboard Table */}
              <h3 className="section-header">Leaderboard</h3>
              <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Total</TableHead>
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
                      {reps.map((rep, i) => (
                        <TableRow key={rep.name} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <TableCell><span className={`text-sm font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">{rep.initials}</div>
                              <span className="text-sm font-medium text-foreground">{rep.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground text-center font-mono">{fmtNum(rep.total)}</TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Qualified"))}>{rep.qualified}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Meeting / Visit Scheduled"))}>{rep.meeting}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Follow-up / Re-call"))}>{rep.followup}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Reserved / Under Contract"))}>{rep.reserved}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Sold / Closed Won"))}>{rep.sold}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("Not Interested"))}>{rep.notInterested}</span></TableCell>
                          <TableCell className="text-center"><span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full", getStatusStyle("No Answer"))}>{rep.noAnswer}</span></TableCell>
                          <TableCell className="text-center">
                            <span className={cn("text-sm font-mono font-bold", rep.convRate >= 3 ? "text-success" : rep.convRate >= 1 ? "text-warning" : "text-destructive")}>
                              {rep.convRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{ratingBadge(rep.convRate)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals */}
                      <TableRow className="bg-secondary/20 border-t-2 border-primary/20 hover:bg-secondary/20">
                        <TableCell />
                        <TableCell className="font-bold text-primary text-sm">الإجمالي</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{fmtNum(totals.total)}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.qualified}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.meeting}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.followup}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.reserved}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.sold}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.notInterested}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.noAnswer}</TableCell>
                        <TableCell className="text-center font-bold text-primary font-mono text-sm">{totals.total > 0 ? ((totals.sold / totals.total) * 100).toFixed(1) : "0"}%</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
