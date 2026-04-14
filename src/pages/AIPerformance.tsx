import { useState, useMemo, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignsData, useLeadsData } from "@/hooks/useDashboardData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmtNum, fmtCurrency, fmtPct } from "@/lib/formatters";
import {
  Sparkles, Send, TrendingUp, Users, Target, AlertTriangle,
  Trophy, ChevronRight, ArrowDown,
} from "lucide-react";

/* ═══════ types ═══════ */
type Msg = { role: "user" | "assistant"; content: string };

/* ═══════ helpers ═══════ */
const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 0 });
const pct = (n: number) => n.toFixed(1);

/* ═══════ Quick Chips ═══════ */
const CHIPS_ROW1 = ["إيه أحسن حملة؟", "مين أحسن سيلز؟", "الميزانية كفاية؟"];
const CHIPS_ROW2 = ["إيه أعمل الأسبوع ده؟", "حلل الـ CPL", "اقترح تحسينات"];

/* ═══════ MAIN ═══════ */
const AIPerformance = () => {
  const { orgId } = useAuth();
  const { data: campaigns = [] } = useCampaignsData();
  const { data: leads = [] } = useLeadsData();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextType, setContextType] = useState<"default" | "campaigns" | "sales" | "budget">("default");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── computed metrics ── */
  const metrics = useMemo(() => {
    const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
    const totalLeads = leads.length;
    const totalCampaignLeads = campaigns.reduce((s, c) => s + (Number(c.leads_count) || 0), 0);
    const avgCpl = totalCampaignLeads > 0 ? totalSpend / totalCampaignLeads : 0;

    const count = (st: string) => leads.filter(l => l.status === st).length;
    const sold = count("Sold / Closed Won");
    const qualified = count("Qualified");
    const meeting = count("Meeting / Visit Scheduled");
    const followup = count("Follow-up / Re-call");
    const reserved = count("Reserved / Under Contract");
    const noAnswer = count("No Answer");
    const notInterested = count("Not Interested");

    const qualityLeads = qualified + meeting + followup + reserved;
    const qualityRate = totalLeads > 0 ? (qualityLeads / totalLeads) * 100 : 0;
    const noAnswerRate = totalLeads > 0 ? (noAnswer / totalLeads) * 100 : 0;
    const notInterestedRate = totalLeads > 0 ? (notInterested / totalLeads) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (sold / totalLeads) * 100 : 0;

    // Per campaign
    const campaignMap: Record<string, { spend: number; leads: number; cpl: number }> = {};
    campaigns.forEach(c => {
      const name = c.campaign_name;
      if (!campaignMap[name]) campaignMap[name] = { spend: 0, leads: 0, cpl: 0 };
      campaignMap[name].spend += Number(c.spend) || 0;
      campaignMap[name].leads += Number(c.leads_count) || 0;
    });
    Object.values(campaignMap).forEach(c => { c.cpl = c.leads > 0 ? c.spend / c.leads : 0; });

    // Per rep
    const repMap: Record<string, { total: number; closed: number; noAnswer: number }> = {};
    leads.forEach(l => {
      const rep = l.assigned_to || "غير معين";
      if (!repMap[rep]) repMap[rep] = { total: 0, closed: 0, noAnswer: 0 };
      repMap[rep].total++;
      if (l.status === "Sold / Closed Won") repMap[rep].closed++;
      if (l.status === "No Answer") repMap[rep].noAnswer++;
    });

    // Quick insights
    const campaignEntries = Object.entries(campaignMap);
    const bestCampaign = campaignEntries.length > 0
      ? campaignEntries.filter(([, d]) => d.leads > 0).sort((a, b) => a[1].cpl - b[1].cpl)[0]
      : null;
    const worstCampaign = campaignEntries.length > 0
      ? campaignEntries.filter(([, d]) => d.leads > 0).sort((a, b) => b[1].cpl - a[1].cpl)[0]
      : null;

    const repEntries = Object.entries(repMap).filter(([n]) => n !== "غير معين" && n !== "Unassigned");
    const mostActiveRep = repEntries.length > 0
      ? repEntries.sort((a, b) => b[1].total - a[1].total)[0]
      : null;
    const bestConvRep = repEntries.length > 0
      ? repEntries.filter(([, d]) => d.total > 0).sort((a, b) => (b[1].closed / b[1].total) - (a[1].closed / a[1].total))[0]
      : null;

    // Critical alert
    let criticalAlert = "";
    let alertLevel: "red" | "orange" = "orange";
    if (avgCpl > 400) { criticalAlert = `CPL ${fmt(avgCpl)} جنيه — خطر`; alertLevel = "red"; }
    else if (qualityRate < 10 && totalLeads > 0) { criticalAlert = `جودة الليدز ${pct(qualityRate)}% — خطر عاجل`; alertLevel = "red"; }
    else if (noAnswerRate > 50) { criticalAlert = `عدم الرد ${pct(noAnswerRate)}% — خطر`; alertLevel = "red"; }
    else if (notInterestedRate > 10) { criticalAlert = `غير مهتمين ${pct(notInterestedRate)}% — راجع الاستهداف`; alertLevel = "orange"; }
    else if (noAnswerRate > 30) { criticalAlert = `عدم الرد ${pct(noAnswerRate)}% — متابعة`; alertLevel = "orange"; }

    return {
      totalSpend, totalLeads, avgCpl, sold, qualityRate, noAnswerRate,
      notInterestedRate, conversionRate, campaignMap, repMap,
      bestCampaign, worstCampaign, mostActiveRep, bestConvRep,
      criticalAlert, alertLevel,
    };
  }, [campaigns, leads]);

  /* ── detect context ── */
  const detectContext = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("حملة") || lower.includes("campaign") || lower.includes("cpl")) return "campaigns";
    if (lower.includes("سيلز") || lower.includes("موظف") || lower.includes("فريق") || lower.includes("sales")) return "sales";
    if (lower.includes("ميزانية") || lower.includes("budget") || lower.includes("إنفاق") || lower.includes("spend")) return "budget";
    return "default";
  };

  /* ── send message ── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg].slice(-10);
    setMessages(newMsgs);
    setIsLoading(true);
    setContextType(detectContext(text));

    // Build data summaries
    const campaignsSummary = Object.entries(metrics.campaignMap)
      .map(([name, d]) => `${name}: CPL=${fmt(d.cpl)}, Leads=${d.leads}, Spend=${fmt(d.spend)}`)
      .join("\n");
    const repsSummary = Object.entries(metrics.repMap)
      .map(([name, d]) => {
        const conv = d.total > 0 ? ((d.closed / d.total) * 100).toFixed(1) : "0";
        return `${name}: Leads=${d.total}, Closed=${d.closed}, Conv=${conv}%`;
      }).join("\n");

    const systemPrompt = `أنت "AI Brain" — مستشار ذكاء اصطناعي متخصص في التسويق والمبيعات. عندك خبرة 15 سنة. بترد بالعربي المصري باحترافية. البيانات من Meta Ads فقط.

بيانات العميل الحقيقية:
إجمالي الإنفاق: ${fmt(metrics.totalSpend)} جنيه | إجمالي الليدز: ${metrics.totalLeads} | متوسط CPL: ${fmt(metrics.avgCpl)} جنيه
معدل التحويل: ${pct(metrics.conversionRate)}% | Quality Rate: ${pct(metrics.qualityRate)}% | No Answer: ${pct(metrics.noAnswerRate)}%
الصفقات المغلقة: ${metrics.sold}

الحملات:
${campaignsSummary}

أداء الموظفين:
${repsSummary}

معايير السوق المصري:
- CPL: أقل من 250=ممتاز، 250-350=كويس، أعلى من 400=خطر
- Quality Leads: 30-40%=كويس، أقل من 10%=خطر عاجل
- No Answer: أقل من 30%=طبيعي، أعلى من 50%=خطر
- Not Interested: أعلى من 10%=استهداف خاطئ
- Conversion: 1-2%=متوسط، 3-5%=ممتاز، 6%+=استثنائي
- ميزانية الإعلان: ابدأ 100-150 جنيه/يوم، الإعلان محتاج 5-7 أيام
- CTR أقل من 1% = Creative محتاج تغيير

خبرة التسويق والمبيعات:
- الحملة الصح 3 مراحل: Awareness → Engagement → Conversion
- تارجتينج حسب المنتج والخدمة — حدد الجمهور المناسب
- Lookalike وCustom Audiences أقوى أنواع التارجتينج
- Lookalike Audience أقوى أنواع التارجتينج
- Hook أول 3 ثواني أهم حاجة في الـ Creative
- Reels أقوى أداة — بتوصل 10x أكتر من الصور
- رد على الليدز بسرعة — أول ساعة حاسمة

التشخيص:
- Quality منخفضة → حلل Audience + Copy + Visuals + Budget
- No Answer عالي → Sales بطيء → راجع سرعة التواصل
- Not Interested عالي → Audience غلط → تعديل التارجت
- CPL عالي وQuality كويس → زود الميزانية تدريجياً

قواعد الرد:
1. عربي مصري — مباشر واحترافي
2. استخدم البيانات الحقيقية في كل رد وقارن بالمعايير
3. ردود قصيرة 3-5 جمل إلا لو طلب تفصيل
4. ادّي خطوات واضحة ومحددة
5. نبّه على أي مشكلة حتى لو مسألش
6. استخدم أرقام دايماً`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          type: "chat",
          systemPrompt,
          prompt: text,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setIsLoading(false); return; }

      const assistantMsg: Msg = { role: "assistant", content: data.report || "لا توجد نتائج" };
      setMessages(prev => [...prev, assistantMsg].slice(-10));
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ── extract recommendations from last assistant messages ── */
  const recentRecs = useMemo(() => {
    const assistantMsgs = messages.filter(m => m.role === "assistant");
    const last3 = assistantMsgs.slice(-3);
    return last3.map((msg, i) => {
      const firstLine = msg.content.split("\n").find(l => l.trim().length > 10) || msg.content.slice(0, 80);
      return { id: i, title: firstLine.slice(0, 60), summary: msg.content.slice(0, 120) + "...", full: msg.content };
    });
  }, [messages]);

  return (
    <DashboardLayout title="AI Performance Marketing" subtitle="مستشارك الذكي للتسويق والمبيعات">
      <div className="relative z-10 page-fade-in space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary animate-spin" style={{ animationDuration: "8s" }} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Performance Marketing</h1>
            <p className="text-sm text-primary">مستشارك الذكي للتسويق والمبيعات</p>
          </div>
        </div>

        {/* ══════ SECTION 1: Quick Insights Bar ══════ */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
          {/* Best Campaign */}
          <Card className="min-w-[180px] shrink-0 snap-start border-border bg-card p-4 card-glow">
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">أفضل حملة</p>
            {metrics.bestCampaign ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate" dir="rtl">{metrics.bestCampaign[0]}</p>
                <p className="text-xs text-success font-bold">{fmt(metrics.bestCampaign[1].cpl)} EGP</p>
                <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">ممتاز</span>
              </>
            ) : <p className="text-xs text-muted-foreground">—</p>}
          </Card>

          {/* Worst Campaign */}
          <Card className="min-w-[180px] shrink-0 snap-start border-border bg-card p-4 card-glow">
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">أسوأ حملة</p>
            {metrics.worstCampaign ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate" dir="rtl">{metrics.worstCampaign[0]}</p>
                <p className="text-xs text-destructive font-bold">{fmt(metrics.worstCampaign[1].cpl)} EGP</p>
                <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">خطر</span>
              </>
            ) : <p className="text-xs text-muted-foreground">—</p>}
          </Card>

          {/* Most Active Rep */}
          <Card className="min-w-[180px] shrink-0 snap-start border-border bg-card p-4 card-glow">
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">أنشط موظف</p>
            {metrics.mostActiveRep ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate">{metrics.mostActiveRep[0]}</p>
                <p className="text-xs text-primary font-bold">{metrics.mostActiveRep[1].total} ليد</p>
              </>
            ) : <p className="text-xs text-muted-foreground">—</p>}
          </Card>

          {/* Best Conversion Rep */}
          <Card className="min-w-[180px] shrink-0 snap-start border-border bg-card p-4 card-glow">
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">أعلى تحويل</p>
            {metrics.bestConvRep ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate">{metrics.bestConvRep[0]}</p>
                <p className="text-xs text-success font-bold">
                  {metrics.bestConvRep[1].total > 0 ? pct((metrics.bestConvRep[1].closed / metrics.bestConvRep[1].total) * 100) : "0"}%
                </p>
              </>
            ) : <p className="text-xs text-muted-foreground">—</p>}
          </Card>

          {/* Critical Alert */}
          <Card className={`min-w-[180px] shrink-0 snap-start border-border bg-card p-4 card-glow ${metrics.criticalAlert ? (metrics.alertLevel === "red" ? "border-l-4 border-l-destructive" : "border-l-4 border-l-warning") : ""}`}>
            <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">تنبيه</p>
            {metrics.criticalAlert ? (
              <p className={`text-xs font-semibold ${metrics.alertLevel === "red" ? "text-destructive" : "text-warning"}`} dir="rtl">
                {metrics.criticalAlert}
              </p>
            ) : (
              <p className="text-xs text-success" dir="rtl">لا توجد تنبيهات</p>
            )}
          </Card>
        </div>

        {/* ══════ SECTION 2: AI Chat ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: "500px" }}>
          {/* LEFT: Chat (60%) */}
          <div className="lg:col-span-3 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" style={{ maxHeight: "500px" }}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="h-10 w-10 text-primary mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground" dir="rtl">ابدأ المحادثة مع AI Brain</p>
                    <p className="text-xs text-muted-foreground mt-1" dir="rtl">اسأل أي سؤال عن حملاتك أو فريق المبيعات</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-accent text-foreground"
                          : "bg-card border border-border border-l-4 border-l-primary text-foreground"
                      }`}
                      dir="rtl"
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border border-l-4 border-l-primary rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2" dir="rtl">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-muted-foreground">AI Brain بيفكر...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Chips */}
            <div className="px-4 py-2 border-t border-border space-y-1.5">
              <div className="flex gap-2 overflow-x-auto">
                {CHIPS_ROW1.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    dir="rtl"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {CHIPS_ROW2.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    dir="rtl"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسأل AI Brain..."
                className="min-h-[44px] max-h-[100px] resize-none bg-background border-border text-foreground"
                dir="rtl"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="bg-primary text-primary-foreground shrink-0 h-[44px] w-[44px] p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* RIGHT: Context Panel (40%) */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
            {contextType === "default" && (
              <>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1">Total Spend</p>
                  <p className="text-xl font-bold text-foreground">{fmt(metrics.totalSpend)} <span className="text-xs text-muted-foreground">EGP</span></p>
                </Card>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1">Total Leads</p>
                  <p className="text-xl font-bold text-foreground">{fmt(metrics.totalLeads)}</p>
                </Card>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1">Avg CPL</p>
                  <p className="text-xl font-bold text-foreground">{fmt(metrics.avgCpl)} <span className="text-xs text-muted-foreground">EGP</span></p>
                </Card>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1">Conversion</p>
                  <p className="text-xl font-bold text-foreground">{pct(metrics.conversionRate)}%</p>
                </Card>
              </>
            )}

            {contextType === "campaigns" && (
              <Card className="border-border bg-card p-4 card-glow">
                <p className="text-sm font-semibold text-foreground mb-3" dir="rtl">الحملات</p>
                <div className="space-y-2">
                  {Object.entries(metrics.campaignMap).slice(0, 6).map(([name, d]) => (
                    <div key={name} className="flex justify-between items-center text-xs border-b border-border pb-1.5">
                      <span className="text-foreground truncate max-w-[120px]" dir="rtl">{name}</span>
                      <span className={`font-bold ${d.cpl < 250 ? 'text-success' : d.cpl <= 350 ? 'text-primary' : 'text-destructive'}`}>
                        {fmt(d.cpl)} EGP
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {contextType === "sales" && (
              <Card className="border-border bg-card p-4 card-glow">
                <p className="text-sm font-semibold text-foreground mb-3" dir="rtl">فريق المبيعات</p>
                <div className="space-y-2">
                  {Object.entries(metrics.repMap).filter(([n]) => n !== "Unassigned" && n !== "غير معين").slice(0, 6).map(([name, d]) => {
                    const conv = d.total > 0 ? (d.closed / d.total) * 100 : 0;
                    return (
                      <div key={name} className="flex justify-between items-center text-xs border-b border-border pb-1.5">
                        <span className="text-foreground truncate max-w-[120px]">{name}</span>
                        <span className={`font-bold ${conv >= 3 ? 'text-success' : conv >= 1 ? 'text-primary' : 'text-destructive'}`}>
                          {pct(conv)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {contextType === "budget" && (
              <>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">إجمالي الإنفاق</p>
                  <p className="text-xl font-bold text-foreground">{fmt(metrics.totalSpend)} EGP</p>
                </Card>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1" dir="rtl">الإيرادات المتوقعة</p>
                  <p className="text-xl font-bold text-success">{fmt(metrics.sold * 500000)} EGP</p>
                </Card>
                <Card className="border-border bg-card p-4 card-glow">
                  <p className="text-[10px] text-muted-foreground mb-1">ROAS</p>
                  <p className="text-xl font-bold text-foreground">
                    {metrics.totalSpend > 0 ? pct((metrics.sold * 500000) / metrics.totalSpend) : "0"}x
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* ══════ SECTION 3: Recent Recommendations ══════ */}
        {recentRecs.length > 0 && (
          <div>
            <h2 className="section-header mb-4">آخر التوصيات</h2>
            <div className="space-y-3">
              {recentRecs.map(rec => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ═══════ Recommendation Card ═══════ */
function RecommendationCard({ rec }: { rec: { title: string; summary: string; full: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border border-l-4 border-l-primary bg-card p-4 card-glow">
      <p className="text-sm font-semibold text-foreground mb-1" dir="rtl">{rec.title}</p>
      <p className="text-xs text-muted-foreground" dir="rtl">
        {expanded ? rec.full : rec.summary}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary mt-2 hover:underline"
        dir="rtl"
      >
        {expanded ? "عرض أقل" : "عرض المزيد"}
      </button>
    </Card>
  );
}

export default AIPerformance;
