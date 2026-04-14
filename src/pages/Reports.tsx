import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import mwLogo from "@/assets/mw-logo.svg";
import { Brain, Download, Loader2, ChevronDown, ChevronRight, ArrowRight, BarChart3, Users, DollarSign, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignsData, useLeadsData, useDashboardKPIs } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { fmtNum, fmtCurrency } from "@/lib/formatters";
import { stages, pipelineFunnelStages } from "@/components/crm/crmUtils";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const DEAL_VALUE = 500000;

const STATUS_COLORS: Record<string, string> = {
  "Qualified": "hsl(82 100% 50%)",
  "Meeting / Visit Scheduled": "hsl(217 91% 60%)",
  "Follow-up / Re-call": "hsl(25 95% 53%)",
  "Reserved / Under Contract": "hsl(271 91% 65%)",
  "Sold / Closed Won": "hsl(142 71% 45%)",
  "Low Budget": "hsl(220 9% 64%)",
  "Not Interested": "hsl(0 84% 60%)",
  "Postponed / Future Interest": "hsl(48 96% 53%)",
  "No Answer": "hsl(220 9% 46%)",
  "Unreachable": "hsl(0 72% 51%)",
  "Wrong Number / Inquiries": "hsl(28 73% 26%)",
  "Junk / Trash": "hsl(215 14% 27%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-foreground">
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Collapsible Section ─── */
function ReportSection({
  title, icon, defaultOpen = true, children, aiTeaser, onAiClick,
}: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
  aiTeaser?: string; onAiClick?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow print:break-inside-avoid animate-fade-in-up">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="section-header !mb-0 !pb-0 !border-l-0 !pl-0 text-base font-bold text-foreground">{title}</h3>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="p-5 space-y-5">{children}</div>
          {aiTeaser && (
            <button
              onClick={onAiClick}
              className="w-full px-5 py-3 border-t border-border bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between group"
            >
              <span className="text-sm text-primary font-medium">{aiTeaser}</span>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const Reports = () => {
  const navigate = useNavigate();
  const { orgId, userRole: role } = useAuth();
  const { toast } = useToast();
  const { totalSpend, totalLeads, dealsClosed, roas, revenue, avgCostPerSale } = useDashboardKPIs();
  const { data: campaigns = [], isLoading: campLoading, error: campError, refetch: campRefetch } = useCampaignsData();
  const { data: leads = [], isLoading: leadsLoading, error: leadsError, refetch: leadsRefetch } = useLeadsData();
  useRealtimeSubscription("campaigns_data", ["campaigns_data"], "reports-campaigns-rt");
  useRealtimeSubscription("leads", ["leads"], "reports-leads-rt");
  const isLoading = campLoading || leadsLoading;

  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ─── Derived data ─── */
  const aggCampaigns = useMemo(() => {
    const byName: Record<string, { spend: number; leads: number; impressions: number; clicks: number; status: string }> = {};
    campaigns.forEach(c => {
      const k = c.campaign_name;
      if (!byName[k]) byName[k] = { spend: 0, leads: 0, impressions: 0, clicks: 0, status: c.status || "active" };
      byName[k].spend += Number(c.spend) || 0;
      byName[k].leads += Number(c.leads_count) || 0;
      byName[k].impressions += Number(c.impressions) || 0;
      byName[k].clicks += Number(c.clicks) || 0;
    });
    return Object.entries(byName).map(([name, d]) => ({
      name,
      ...d,
      cpl: d.leads > 0 ? d.spend / d.leads : 0,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
    })).sort((a, b) => b.spend - a.spend);
  }, [campaigns]);

  const totals = useMemo(() => ({
    spend: aggCampaigns.reduce((s, c) => s + c.spend, 0),
    leads: aggCampaigns.reduce((s, c) => s + c.leads, 0),
    impressions: aggCampaigns.reduce((s, c) => s + c.impressions, 0),
    clicks: aggCampaigns.reduce((s, c) => s + c.clicks, 0),
  }), [aggCampaigns]);

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { const s = l.status || "Qualified"; counts[s] = (counts[s] || 0) + 1; });
    return stages.map(st => ({ name: st.label, value: counts[st.id] || 0, color: STATUS_COLORS[st.id] || "hsl(0 0% 40%)" })).filter(s => s.value > 0);
  }, [leads]);

  const maxStatusCount = Math.max(...statusDist.map(s => s.value), 1);

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { const s = l.status || "Qualified"; counts[s] = (counts[s] || 0) + 1; });
    return pipelineFunnelStages.map((stage, i) => {
      const count = counts[stage] || 0;
      const prev = i > 0 ? (counts[pipelineFunnelStages[i - 1]] || 0) : count;
      return { stage, count, convFromPrev: prev > 0 ? ((count / prev) * 100).toFixed(0) : "0" };
    });
  }, [leads]);

  const maxPipelineCount = Math.max(...pipeline.map(p => p.count), 1);

  const reps = useMemo(() => {
    const grouped: Record<string, { total: number; closed: number }> = {};
    leads.forEach(l => {
      const name = l.assigned_to?.trim() || "Unassigned";
      if (!grouped[name]) grouped[name] = { total: 0, closed: 0 };
      grouped[name].total++;
      if (l.status === "Sold / Closed Won") grouped[name].closed++;
    });
    return Object.entries(grouped)
      .map(([name, d]) => ({
        name,
        leads: d.total,
        closed: d.closed,
        conv: d.total > 0 ? ((d.closed / d.total) * 100).toFixed(1) : "0",
        revenue: d.closed * DEAL_VALUE,
      }))
      .sort((a, b) => b.closed - a.closed);
  }, [leads]);

  const spendChartData = aggCampaigns.slice(0, 8).map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    spend: c.spend,
    leads: c.leads,
  }));

  const bestCampaign = useMemo(() => {
    const withLeads = aggCampaigns.filter(c => c.leads > 0);
    return withLeads.length > 0 ? withLeads.reduce((a, b) => a.cpl < b.cpl ? a : b) : null;
  }, [aggCampaigns]);

  const now = new Date();
  const dateRange = `${now.toLocaleDateString("en", { month: "long", day: "numeric" })} ${now.getFullYear()}`;

  const generateAI = async () => {
    if (!orgId) return;
    setAiLoading(true);
    try {
      const statusCounts: Record<string, number> = {};
      const assignedCounts: Record<string, number> = {};
      leads.forEach(l => {
        statusCounts[l.status || "Unknown"] = (statusCounts[l.status || "Unknown"] || 0) + 1;
        if (l.assigned_to) assignedCounts[l.assigned_to] = (assignedCounts[l.assigned_to] || 0) + 1;
      });

      // Build compact data summary
      const campSummary = aggCampaigns.map(c => `${c.name}: CPL=${Math.round(c.cpl)}, Leads=${c.leads}, Spend=${Math.round(c.spend)}`).join(" | ");
      const repSummary = reps.map(r => `${r.name}: ${r.leads} leads, ${r.closed} closed, ${r.conv}%`).join(" | ");

      const prompt = `البيانات من Meta Ads فقط.

الحملات: ${campSummary}
الإنفاق: ${Math.round(totals.spend)} | الليدز: ${totals.leads} | CPL: ${totals.leads > 0 ? Math.round(totals.spend / totals.leads) : 0}
الحالات: ${JSON.stringify(statusCounts)}
فريق المبيعات: ${repSummary}`;

      const systemPrompt = `أنت مستشار تسويق محترف بتكتب تقرير أسبوعي لصاحب شركة.
أسلوبك بالعامية المصرية بس محترم ومهني — مش بتهاجم ومش بتخوف.
أنت بتساعد العميل يفهم وضعه ويتحسن، مش بتحكم عليه.
البيانات من Meta Ads فقط.

التقرير 8 سطور بالظبط:

سطر 1: ملخص إيجابي — ابدأ بأحسن حاجة حصلت الأسبوع ده
سطر 2: أفضل حملة — اسمها وليه كويسة بالأرقام
سطر 3: الحملة اللي محتاجة تحسين — اسمها وإيه اللي ممكن يتعمل (بدون كلام سلبي)
سطر 4: الـ CPL — قارنه بالسوق بشكل محفز
سطر 5: فريق المبيعات — امدح الشاطر وشجع اللي محتاج يتحسن
سطر 6: فرصة ممكن تستغلها الأسبوع الجاي
سطر 7: نصيحة عملية واحدة تقدر تطبقها فوراً
سطر 8: جملة تحفيزية ختامية

القواعد المهمة:
- عامية مصرية محترمة — زي مستشار بيتكلم مع CEO
- ممنوع كلمات سلبية زي: خازوق، فشل، حرق فلوس، كارثة، وحش، ضعيف
- بدل "أفشل حملة" قول "الحملة اللي محتاجة تحسين"
- بدل "حرق فلوس" قول "ممكن نوجه الميزانية دي أحسن"
- بدل "أداء ضعيف" قول "عنده فرصة يتحسن"
- بدل "خسارة" قول "محتاج نراجع الاستراتيجية"
- ابدأ دايماً بالإيجابي قبل أي ملاحظة
- كل ملاحظة لازم يكون معاها حل أو اقتراح
- أرقام حقيقية في كل سطر
- مفيش bullet points ولا headers — كل سطر جملة واحدة مباشرة
- الهدف: العميل يقرأ التقرير ويحس إنه فاهم وعارف يعمل إيه، مش يحس إنه بيتهاجم`;

      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { type: "report", systemPrompt, prompt },
      });
      if (error) throw new Error(error.message || "AI analysis failed");
      if (data?.error) throw new Error(data.error);
      setAiReport(data?.report || "No response");
      toast({ title: "تم إنشاء التقرير", description: "التقرير جاهز" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reportError = campError || leadsError;
  const reportRefetch = () => { campRefetch(); leadsRefetch(); };

  if (reportError) {
    return (
      <DashboardLayout title="Reports" subtitle="Facebook Ads Manager style analytics">
        <ErrorState message="Error loading report data" onRetry={reportRefetch} />
      </DashboardLayout>
    );
  }

  // Parse AI report into 8 lines
  const aiLines = aiReport ? aiReport.split("\n").map(l => l.replace(/^\d+[\.\-\)]\s*/, "").trim()).filter(l => l.length > 0) : [];

  const closedRevenue = dealsClosed * DEAL_VALUE;

  return (
    <DashboardLayout title="Reports" subtitle="Facebook Ads Manager style analytics">
      <div className="page-fade-in space-y-6">
        {/* Print logo */}
        <div className="print-logo hidden">
          <img src={mwLogo} alt="MW Growth Systems" />
        </div>
        {/* Header */}
          <div className="flex items-center justify-between no-print">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Performance Report</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{dateRange}</p>
          </div>
          {['owner', 'sales_manager', 'super_admin'].includes(role || '') && (
            <Button variant="outline" size="sm" className="gap-2 text-xs no-print" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          )}
        </div>

        {/* Print header */}
        <div className="hidden print:flex print:items-center print:justify-between print:mb-6 print:pb-4 print:border-b-2 print:border-primary/30">
          <div>
            <h1 className="text-2xl font-bold text-foreground">MW Growth Systems — Performance Report</h1>
            <p className="text-sm text-muted-foreground">{dateRange}</p>
          </div>
        </div>

        {/* ═══ HERO: AI Report (8 lines) ═══ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">AI Report</h3>
            </div>
            <div className="flex items-center gap-2">
              {aiReport && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs no-print" onClick={() => window.print()}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 no-print"
                onClick={generateAI}
                disabled={aiLoading}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {aiLoading ? "جاري التحليل..." : "Generate Report"}
              </Button>
            </div>
          </div>

          <div className="p-5">
            {aiLoading && !aiReport && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="relative">
                  <Brain className="h-10 w-10 text-primary animate-pulse" />
                  <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground">Gemini بيحلل البيانات...</p>
              </div>
            )}

            {!aiLoading && !aiReport && (
              <div className="text-center py-8">
                <Brain className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground" dir="rtl">اضغط "Generate Report" للحصول على تقرير ذكي مختصر من 8 سطور</p>
              </div>
            )}

            {aiLines.length > 0 && (
              <div className="space-y-0">
                {aiLines.slice(0, 8).map((line, i) => (
                  <div key={i} className={`flex items-start gap-4 py-3 ${i < 7 ? "border-b border-border/30" : ""}`}>
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-base text-foreground leading-relaxed" dir="rtl">{line}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ SECTION 1: Campaign Performance ═══ */}
        <ReportSection
          title="Campaign Performance"
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          aiTeaser={bestCampaign ? `حملة ${bestCampaign.name} تحقق أفضل CPL (${fmtNum(Math.round(bestCampaign.cpl))} EGP) — اضغط للتفاصيل →` : undefined}
          onAiClick={() => navigate("/ai-brain")}
        >
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {["Campaign", "Spend", "Leads", "CPL", "Impressions", "Clicks", "CTR", "Status"].map(h => (
                      <th key={h} className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5 ${h === "Campaign" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aggCampaigns.map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 text-sm font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{fmtNum(c.spend)}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{fmtNum(c.leads)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-sm font-mono font-semibold ${c.cpl > 0 && c.cpl < 420 ? "text-success" : c.cpl > 420 ? "text-destructive" : "text-foreground"}`}>
                          {fmtNum(Math.round(c.cpl))}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{fmtNum(c.impressions)}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{fmtNum(c.clicks)}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{c.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-primary/15 text-primary" : c.status === "paused" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/20 border-t-2 border-primary/20">
                    <td className="px-4 py-2.5 text-sm font-bold text-primary">Totals</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{fmtNum(totals.spend)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{fmtNum(totals.leads)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{totals.leads > 0 ? fmtNum(Math.round(totals.spend / totals.leads)) : "—"}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{fmtNum(totals.impressions)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{fmtNum(totals.clicks)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-primary text-right font-mono">{totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0"}%</td>
                    <td className="px-4 py-2.5" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && spendChartData.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Spend vs Leads per Campaign</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={spendChartData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0 0% 20%)" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(0 0% 65%)" }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={55} />
                  <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="leads" orientation="right" tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="spend" dataKey="spend" name="Spend" fill="hsl(271 81% 56%)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                  <Bar yAxisId="leads" dataKey="leads" name="Leads" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportSection>

        {/* ═══ SECTION 2: Sales & CRM Performance ═══ */}
        <ReportSection
          title="Sales & CRM Performance"
          icon={<Users className="h-5 w-5 text-blue-400" />}
          aiTeaser="معدل التحويل يمكن تحسينه بنسبة 40% — اضغط للتوصيات →"
          onAiClick={() => navigate("/ai-brain")}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Leads by Status</p>
            <div className="space-y-2">
              {statusDist.map(s => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-44 text-right shrink-0 truncate">{s.name}</span>
                  <div className="flex-1 h-7 bg-secondary/30 rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{ width: `${Math.max((s.value / maxStatusCount) * 100, 4)}%`, backgroundColor: s.color }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-foreground">
                      {s.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isLoading && reps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Sales Team Performance</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Rep</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Leads</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Closed</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Conv Rate</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map(rep => (
                      <tr key={rep.name} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                              {rep.name === "Unassigned" ? "?" : rep.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-foreground">{rep.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{rep.leads}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{rep.closed}</td>
                        <td className="px-4 py-2.5 text-right"><span className="text-sm font-mono text-primary">{rep.conv}%</span></td>
                        <td className="px-4 py-2.5 text-sm text-foreground text-right font-mono">{fmtCurrency(rep.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Sales Pipeline Funnel</p>
            <div className="space-y-2">
              {pipeline.map((p, i) => (
                <div key={p.stage} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-44 text-right shrink-0">{p.stage}</span>
                  <div className="flex-1 h-8 bg-secondary/30 rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{
                        width: `${Math.max((p.count / maxPipelineCount) * 100, 4)}%`,
                        backgroundColor: STATUS_COLORS[p.stage] || "hsl(0 0% 40%)",
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-foreground">
                      {p.count}
                    </span>
                  </div>
                  {i > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">{p.convFromPrev}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ReportSection>

        {/* ═══ SECTION 3: Financial Summary ═══ */}
        <ReportSection
          title="Financial Summary"
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Spend", value: fmtCurrency(totalSpend), border: "hsl(0 84% 60%)" },
              { label: "Total Revenue", value: fmtCurrency(closedRevenue), border: "hsl(142 71% 45%)" },
              { label: "ROAS", value: `${roas.toFixed(1)}x`, border: "hsl(271 81% 56%)" },
              { label: "Avg Cost Per Sale", value: fmtCurrency(avgCostPerSale), border: "hsl(38 92% 50%)" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-secondary/20 border border-border rounded-xl p-5" style={{ borderLeft: `3px solid ${kpi.border}` }}>
                <p className="text-xs text-muted-foreground mb-2">{kpi.label}</p>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <AnimatedCounter value={kpi.value} className="text-2xl font-bold text-foreground font-mono" />
                )}
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border print:mt-8">
          <p className="text-xs text-muted-foreground">
            Report generated {now.toLocaleDateString("en", { dateStyle: "medium" })} • MW Growth Systems
          </p>
          {['owner', 'sales_manager', 'super_admin'].includes(role || '') && (
            <Button variant="outline" size="sm" className="gap-2 text-xs no-print" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
