import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Play,
  Clock,
  BarChart3,
  Crosshair,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SalesLeaderboard } from "@/components/sky-brain/SalesLeaderboard";
import { AIDeepAnalysis } from "@/components/sky-brain/AIDeepAnalysis";


/* ═══════════════════════ types ═══════════════════════ */
interface CampaignRow {
  campaign_name: string;
  spend: number | null;
  leads_count: number | null;
  cpl: number | null;
}
interface LeadRow {
  status: string | null;
  assigned_to: string | null;
}
interface Alert {
  level: "red" | "orange" | "green";
  text: string;
  link: string;
}

/* ═══════════════════════ helpers ═══════════════════════ */
const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 0 });
const pct = (n: number) => n.toFixed(1);

function calcScore(cplAvg: number, qualityRate: number, convRate: number, noAnswerRate: number, hasCampaigns: boolean, hasLeads: boolean) {
  // If no data → score = 0 (not misleading high scores)
  const cs = !hasCampaigns ? 0 : cplAvg <= 250 ? 25 : cplAvg <= 350 ? 20 : cplAvg <= 400 ? 12 : 5;
  const qs = !hasLeads ? 0 : qualityRate >= 40 ? 25 : qualityRate >= 30 ? 20 : qualityRate >= 20 ? 12 : 5;
  const ss = !hasLeads ? 0 : convRate >= 5 ? 25 : convRate >= 3 ? 20 : convRate >= 1 ? 12 : 5;
  const rs = !hasLeads ? 0 : noAnswerRate < 20 ? 25 : noAnswerRate <= 35 ? 20 : noAnswerRate <= 50 ? 12 : 5;
  return { campaign: cs, quality: qs, sales: ss, response: rs, total: cs + qs + ss + rs };
}

function scoreColor(total: number) {
  if (total >= 81) return "hsl(var(--success))";
  if (total >= 61) return "hsl(var(--primary))";
  if (total >= 41) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function miniColor(v: number) {
  if (v > 20) return "text-success bg-success/10 border-success/30";
  if (v >= 10) return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30 animate-pulse";
}

/* ═══════════════════════ Circular Gauge ═══════════════════════ */
function CircularGauge({ value, color }: { value: number; color: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(eased * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const r = 85;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * animated) / 100;

  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="100" cy="100" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-100"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{animated}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/* ═══════════════════════ Mini Score Card ═══════════════════════ */
function MiniScoreCard({ label, value, max }: { label: string; value: number; max: number }) {
  const classes = miniColor(value);
  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-lg font-bold">{value}<span className="text-xs font-normal">/{max}</span></p>
      <div className="mt-1.5 h-1.5 rounded-full bg-background/30">
        <div
          className="h-full rounded-full bg-current transition-all duration-700"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════ Alert Card ═══════════════════════ */
function AlertCard({ alert }: { alert: Alert }) {
  const navigate = useNavigate();
  const styles = {
    red: { border: "border-l-destructive", bg: "bg-destructive/5", Icon: AlertTriangle, iconCls: "text-destructive" },
    orange: { border: "border-l-warning", bg: "bg-warning/5", Icon: AlertCircle, iconCls: "text-warning" },
    green: { border: "border-l-success", bg: "bg-success/5", Icon: CheckCircle2, iconCls: "text-success" },
  }[alert.level];

  return (
    <div
      className={`min-w-[280px] snap-start shrink-0 border-l-4 ${styles.border} ${styles.bg} rounded-r-lg p-4 cursor-pointer hover:brightness-110 transition-all`}
      onClick={() => navigate(alert.link)}
    >
      <div className="flex items-start gap-3">
        <styles.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${styles.iconCls}`} />
        <p className="text-sm text-foreground leading-relaxed" dir="rtl">{alert.text}</p>
      </div>
      <div className="flex justify-end mt-2">
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

/* ═══════════════════════ Compact Campaign Card ═══════════════════════ */
function cplBadge(cpl: number) {
  if (cpl < 250) return { label: "ممتاز", cls: "bg-success/20 text-success" };
  if (cpl <= 350) return { label: "كويس", cls: "bg-primary/20 text-primary" };
  if (cpl <= 400) return { label: "ضعيف", cls: "bg-warning/20 text-warning" };
  return { label: "خطر", cls: "bg-destructive/20 text-destructive animate-pulse" };
}

function cplColor(cpl: number) {
  if (cpl < 250) return "text-success";
  if (cpl <= 350) return "text-primary";
  return "text-destructive";
}

function cplVerdict(cpl: number) {
  if (cpl < 250) return "أداء ممتاز — فرصة لزيادة الميزانية";
  if (cpl <= 350) return "أداء جيد — استمر مع تحسينات طفيفة";
  if (cpl <= 400) return "يحتاج تحسين — راجع الاستهداف والمحتوى";
  return "خطر — أوقف وراجع الحملة فوراً";
}

function CompactCampaignRow({ campaigns }: { campaigns: CampaignRow[] }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };
  const active = campaigns.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="section-header">الحملات</h2>
          <Crosshair className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{active} حملة نشطة</span>
          <button onClick={() => scroll(-1)} className="p-1 rounded hover:bg-accent transition-colors hidden md:block">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => scroll(1)} className="p-1 rounded hover:bg-accent transition-colors hidden md:block">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      {campaigns.length === 0 ? (
        <Card className="border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground" dir="rtl">لا توجد حملات بعد</p>
        </Card>
      ) : (
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {campaigns.map((c, i) => {
            const cpl = c.cpl || 0;
            const badge = cplBadge(cpl);
            return (
              <div
                key={i}
                className="min-w-[200px] max-w-[200px] snap-start shrink-0 rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-all card-glow"
                onClick={() => navigate("/campaigns")}
              >
                <p className="text-sm font-semibold text-foreground truncate mb-2" dir="rtl">{c.campaign_name}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${cpl < 250 ? 'bg-success' : cpl <= 350 ? 'bg-primary' : cpl <= 400 ? 'bg-warning' : 'bg-destructive'}`} />
                  <span className={`text-[10px] font-bold ${badge.cls} px-1.5 py-0.5 rounded-full`}>{badge.label}</span>
                </div>
                <p className={`text-xl font-bold ${cplColor(cpl)} mb-1`}>
                  {fmt(cpl)} <span className="text-xs text-muted-foreground">EGP</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed" dir="rtl">{cplVerdict(cpl)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ Benchmark Card ═══════════════════════ */
function BenchmarkCard({ label, yours, market, unit, lowerBetter }: { label: string; yours: number; market: number; unit: string; lowerBetter?: boolean }) {
  const hasData = yours > 0;
  const isBetter = hasData && (lowerBetter ? yours < market : yours > market);
  const yourPct = hasData ? Math.min((yours / Math.max(yours, market, 1)) * 100, 100) : 0;
  const marketPct = Math.min((market / Math.max(yours, market, 1)) * 100, 100);

  return (
    <Card className="border-border bg-card p-5 card-glow">
      <p className="text-sm font-medium text-foreground mb-4" dir="rtl">{label}</p>
      {!hasData ? (
        <div className="text-center py-4">
          <p className="text-lg font-bold text-muted-foreground mb-1">—</p>
          <p className="text-xs text-muted-foreground" dir="rtl">لا توجد بيانات للمقارنة</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">أنت</span>
                <span className={isBetter ? "text-success font-bold" : "text-destructive font-bold"}>{fmt(yours)} {unit}</span>
              </div>
              <div className="h-2 rounded-full bg-border">
                <div className={`h-full rounded-full transition-all duration-700 ${isBetter ? 'bg-success' : 'bg-destructive'}`} style={{ width: `${yourPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">السوق</span>
                <span className="text-muted-foreground">{fmt(market)} {unit}</span>
              </div>
              <div className="h-2 rounded-full bg-border">
                <div className="h-full rounded-full bg-muted-foreground/40 transition-all duration-700" style={{ width: `${marketPct}%` }} />
              </div>
            </div>
          </div>
          {isBetter && (
            <div className="mt-3 flex justify-end">
              <span className="text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full">أفضل من السوق</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
const SkyBrain = () => {
  const { orgId } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      setLoading(true);
      const [cRes, lRes, aRes] = await Promise.all([
        supabase.from("campaigns_data").select("campaign_name, spend, leads_count, cpl").eq("org_id", orgId),
        supabase.from("leads").select("status, assigned_to").eq("org_id", orgId),
        supabase.from("assignment_log" as any).select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
      ]);
      setCampaigns((cRes.data as CampaignRow[]) || []);
      setLeads((lRes.data as LeadRow[]) || []);
      setAssignmentLogs((aRes.data as any[]) || []);
      setLastAnalyzed(new Date());
      setLoading(false);
    };
    load();
  }, [orgId]);

  /* ── metrics ── */
  const m = useMemo(() => {
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    // Use campaign leads_count from Meta Ads (not leads table row count)
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads_count || 0), 0);
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    const count = (st: string) => leads.filter(l => l.status === st).length;
    const countMulti = (sts: string[]) => leads.filter(l => sts.includes(l.status || "")).length;

    const qualified = count("Qualified");
    const meeting = count("Meeting / Visit Scheduled");
    const followup = count("Follow-up / Re-call");
    const reserved = count("Reserved / Under Contract");
    const sold = count("Sold / Closed Won");
    const notInterested = count("Not Interested");
    const noAnswer = count("No Answer");
    const unreachable = count("Unreachable");
    const lowBudget = count("Low Budget");
    const junk = countMulti(["Junk / Trash", "Wrong Number / Inquiries"]);

    const qualityLeads = qualified + meeting + followup + reserved;
    const qualityRate = totalLeads > 0 ? (qualityLeads / totalLeads) * 100 : 0;
    const noAnswerRate = totalLeads > 0 ? (noAnswer / totalLeads) * 100 : 0;
    const notInterestedRate = totalLeads > 0 ? (notInterested / totalLeads) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (sold / totalLeads) * 100 : 0;

    // Only include reps with email addresses (filter out fake names)
    const repMap: Record<string, { total: number; closed: number; noAnswer: number }> = {};
    leads.forEach(l => {
      const rep = l.assigned_to || "";
      if (!rep || !rep.includes("@")) return;
      if (!repMap[rep]) repMap[rep] = { total: 0, closed: 0, noAnswer: 0 };
      repMap[rep].total++;
      if (l.status === "Sold / Closed Won") repMap[rep].closed++;
      if (l.status === "No Answer") repMap[rep].noAnswer++;
    });

    return {
      totalSpend, totalLeads, avgCpl, qualified, meeting, followup, reserved, sold,
      notInterested, noAnswer, unreachable, lowBudget, junk, qualityLeads, qualityRate,
      noAnswerRate, notInterestedRate, conversionRate, repMap,
    };
  }, [campaigns, leads]);

  const scores = useMemo(
    () => calcScore(m.avgCpl, m.qualityRate, m.conversionRate, m.noAnswerRate, campaigns.length > 0, leads.length > 0),
    [m, campaigns.length, leads.length]
  );
  const hasNoData = campaigns.length === 0 && leads.length === 0;

  /* ── alerts ── */
  const alerts = useMemo(() => {
    const a: Alert[] = [];
    if (m.avgCpl > 400) a.push({ level: "red", text: `تكلفة الليد ${fmt(m.avgCpl)} جنيه — أعلى من الحد الآمن (400 جنيه)`, link: "/campaigns" });
    if (m.qualityRate < 10 && m.totalLeads > 0) a.push({ level: "red", text: `جودة الليدز ${pct(m.qualityRate)}% — خطر عاجل!`, link: "/crm" });
    if (m.noAnswerRate > 50) a.push({ level: "red", text: `نسبة عدم الرد ${pct(m.noAnswerRate)}% — مشكلة متابعة خطيرة`, link: "/sales" });
    campaigns.forEach(c => {
      if ((c.cpl || 0) > 500) a.push({ level: "red", text: `حملة ${c.campaign_name} تكلفة الليد ${fmt(c.cpl || 0)} جنيه — خطر`, link: "/campaigns" });
    });
    Object.entries(m.repMap).forEach(([rep, s]) => {
      if (s.total > 5 && (s.closed / s.total) * 100 < 1) a.push({ level: "red", text: `${rep} معدل تحويل ${pct((s.closed / s.total) * 100)}%`, link: "/sales" });
    });
    if (m.notInterestedRate > 10) a.push({ level: "orange", text: `نسبة غير المهتمين ${pct(m.notInterestedRate)}% — راجع الاستهداف`, link: "/campaigns" });
    if (m.noAnswerRate > 30 && m.noAnswerRate <= 50) a.push({ level: "orange", text: `نسبة عدم الرد ${pct(m.noAnswerRate)}% — تحتاج متابعة`, link: "/sales" });
    campaigns.forEach(c => {
      if ((c.cpl || 0) > 350 && (c.cpl || 0) <= 500) a.push({ level: "orange", text: `حملة ${c.campaign_name} CPL يقترب من الحد (${fmt(c.cpl || 0)} جنيه)`, link: "/campaigns" });
    });
    if (m.qualified > 10) a.push({ level: "orange", text: `${m.qualified} ليد Qualified بدون حركة`, link: "/crm" });
    // Assignment alerts from assignment_log
    assignmentLogs.forEach(log => {
      if (log.reason === "auto_assign_new_lead") {
        a.push({ level: "orange", text: `ليد تم توزيعه تلقائياً على ${log.to_rep}`, link: "/crm" });
      }
    });
    if (m.avgCpl > 0 && m.avgCpl < 250) a.push({ level: "green", text: `CPL ممتاز (${fmt(m.avgCpl)} جنيه) — فرصة لزيادة الميزانية`, link: "/campaigns" });
    if (m.qualityRate > 40) a.push({ level: "green", text: `جودة الليدز ممتازة (${pct(m.qualityRate)}%)`, link: "/crm" });
    Object.entries(m.repMap).forEach(([rep, s]) => {
      if (s.total > 0 && (s.closed / s.total) * 100 > 5) a.push({ level: "green", text: `${rep} أداء استثنائي — معدل ${pct((s.closed / s.total) * 100)}%`, link: "/sales" });
    });
    if (m.conversionRate > 3) a.push({ level: "green", text: `معدل التحويل الإجمالي ممتاز (${pct(m.conversionRate)}%)`, link: "/sales" });
    return a;
  }, [m, campaigns, assignmentLogs]);

  const handleRefresh = () => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      supabase.from("campaigns_data").select("campaign_name, spend, leads_count, cpl").eq("org_id", orgId),
      supabase.from("leads").select("status, assigned_to").eq("org_id", orgId),
    ]).then(([cRes, lRes]) => {
      setCampaigns((cRes.data as CampaignRow[]) || []);
      setLeads((lRes.data as LeadRow[]) || []);
      setLastAnalyzed(new Date());
      setLoading(false);
    });
  };

  const timeSince = lastAnalyzed
    ? `منذ ${Math.max(0, Math.floor((Date.now() - lastAnalyzed.getTime()) / 60000))} دقائق`
    : "";

  if (loading) {
    return (
      <DashboardLayout title="AI Growth Brain" subtitle="مركز الذكاء">
        <div className="space-y-6 page-fade-in">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Brain className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-foreground font-semibold text-lg">جاري التحليل...</p>
            <p className="text-muted-foreground text-sm">الذكاء الاصطناعي يدرس بياناتك</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-6">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Growth Brain" subtitle="مركز الذكاء">
      {/* Neural background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1.5" fill="hsl(var(--primary))" />
              <line x1="50" y1="50" x2="100" y2="0" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              <line x1="50" y1="50" x2="0" y2="100" stroke="hsl(var(--primary))" strokeWidth="0.5" />
              <line x1="50" y1="50" x2="100" y2="100" stroke="hsl(var(--primary))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural)" />
        </svg>
      </div>

      <div className="relative z-10 page-fade-in space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Growth Brain</h1>
              <p className="text-sm text-primary">مركز الذكاء</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timeSince && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeSince}
              </span>
            )}
            <Button onClick={handleRefresh} className="bg-primary text-primary-foreground gap-2">
              <Play className="h-4 w-4" /> Run Deep Analysis
            </Button>
          </div>
        </div>

        {/* ══════ SECTION 1: Business Health Score ══════ */}
        <Card className="border-border bg-card p-6 card-glow">
          <h2 className="section-header mb-6">Business Health Score</h2>
          {hasNoData ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CircularGauge value={0} color="hsl(var(--muted-foreground))" />
              <p className="text-sm font-medium text-muted-foreground text-center" dir="rtl">
                لا توجد بيانات كافية لحساب الصحة
              </p>
              <p className="text-xs text-muted-foreground text-center" dir="rtl">
                ابدأ بإضافة حملات وليدز لرؤية التحليل
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <CircularGauge value={scores.total} color={scoreColor(scores.total)} />
                <p className="text-sm text-muted-foreground text-center" dir="rtl">
                  بناءً على تحليل {campaigns.length} حملة و {m.totalLeads} ليد
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1 w-full max-w-md">
                <MiniScoreCard label="Campaign Health" value={scores.campaign} max={25} />
                <MiniScoreCard label="Lead Quality" value={scores.quality} max={25} />
                <MiniScoreCard label="Sales Performance" value={scores.sales} max={25} />
                <MiniScoreCard label="Response Speed" value={scores.response} max={25} />
              </div>
            </div>
          )}
        </Card>

        {/* ══════ SECTION 2: Live Alert Center ══════ */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="section-header">تنبيهات ذكية</h2>
            <div className="w-2 h-2 rounded-full bg-destructive status-dot-pulse" />
          </div>
          {alerts.length === 0 ? (
            <Card className="border-border bg-card p-6 text-center">
              {hasNoData ? (
                <>
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground" dir="rtl">ابدأ حملتك الأولى لرؤية التنبيهات</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground" dir="rtl">لا توجد تنبيهات — كل شيء يعمل بشكل جيد</p>
                </>
              )}
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              {alerts.map((a, i) => (
                <AlertCard key={i} alert={a} />
              ))}
            </div>
          )}
        </div>

        {/* ══════ MERGED B: Market Benchmark ══════ */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="section-header">مقارنة بالسوق</h2>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BenchmarkCard label="تكلفة الليد (CPL)" yours={m.avgCpl} market={420} unit="EGP" lowerBetter />
            <BenchmarkCard label="معدل التحويل" yours={m.conversionRate} market={2} unit="%" />
            <BenchmarkCard label="جودة الليدز" yours={m.qualityRate} market={30} unit="%" />
          </div>
        </div>

        {/* ══════ SECTION 3: Compact Campaign War Room ══════ */}
        <CompactCampaignRow campaigns={campaigns} />

        {/* ══════ SECTION 5: Sales Leaderboard ══════ */}
        <SalesLeaderboard repMap={m.repMap} />

        {/* ══════ SECTION 6: AI Deep Analysis ══════ */}
        <AIDeepAnalysis campaigns={campaigns} metrics={m} />

      </div>
    </DashboardLayout>
  );
};

export default SkyBrain;
