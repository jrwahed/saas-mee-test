import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Swords, Eye, FileText, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { getThreatStyle } from "./competitorUtils";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitors: Tables<"competitors">[];
  intel: Tables<"competitor_intel">[];
  reports: Tables<"competitor_reports">[];
}

type AnalysisType = "threat_assessment" | "battle_plan" | "opportunity_scan" | "weekly_brief";

const LOADING_MESSAGES = [
  "جاري تحليل المنافسين...",
  "جاري إعداد الخطة الاستراتيجية...",
  "جاري تحديد الفرص...",
  "جاري إعداد التقرير النهائي...",
];

const ANALYSIS_OPTIONS: { type: AnalysisType; label: string; icon: React.ReactNode; desc: string; descAr: string }[] = [
  {
    type: "threat_assessment", label: "Threat Assessment", icon: <ShieldAlert className="h-5 w-5" />,
    desc: "Analyze a specific competitor's threat level",
    descAr: "تحليل مستوى التهديد لمنافس معين",
  },
  {
    type: "battle_plan", label: "Battle Plan", icon: <Swords className="h-5 w-5" />,
    desc: "Strategic action plan against all competitors",
    descAr: "خطة معركة استراتيجية ضد كل المنافسين",
  },
  {
    type: "opportunity_scan", label: "Opportunity Scan", icon: <Eye className="h-5 w-5" />,
    desc: "Find gaps and opportunities to exploit",
    descAr: "اكتشف الفجوات والفرص في السوق",
  },
  {
    type: "weekly_brief", label: "Weekly Brief", icon: <FileText className="h-5 w-5" />,
    desc: "Summary of all competitor activity this week",
    descAr: "ملخص نشاط المنافسين هذا الأسبوع",
  },
];

export function BattleStation({ competitors, intel, reports }: Props) {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<string>("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [report, setReport] = useState("");
  const [activeType, setActiveType] = useState<string>("");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all");
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = useCallback(async (type: AnalysisType) => {
    if (!orgId || loading) return;
    setLoading(true);
    setLoadingType(type);
    try {
      const payload: Record<string, unknown> = { type, data: { competitors, intel: intel.slice(0, 30) } };
      if (type === "threat_assessment" && selectedCompetitor !== "all") {
        const comp = competitors.find(c => c.id === selectedCompetitor);
        const compIntel = intel.filter(i => i.competitor_id === selectedCompetitor).slice(0, 20);
        payload.data = { competitor: comp, intel: compIntel };
      }
      const { data, error } = await supabase.functions.invoke("competitor-ai-analyze", { body: payload });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setLoading(false); setLoadingType(""); return; }
      setReport(data?.report || "No analysis available");
      setActiveType(type);
      toast.success("Analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    }
    setLoading(false);
    setLoadingType("");
  }, [orgId, loading, competitors, intel, selectedCompetitor]);

  const toggleReport = (id: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">AI Battle Station</h3>
      </div>

      {/* Competitor selector for threat assessment */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Target:</span>
        <select value={selectedCompetitor} onChange={e => setSelectedCompetitor(e.target.value)}
          className="h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground">
          <option value="all">All Competitors</option>
          {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ANALYSIS_OPTIONS.map(opt => (
          <button key={opt.type} onClick={() => handleGenerate(opt.type)}
            disabled={loading}
            className={cn(
              "glass-card border border-border/50 rounded-xl p-5 text-left transition-all group",
              "hover:border-primary/30 hover:shadow-[0_0_20px_hsl(271_81%_56%_/_0.08)]",
              activeType === opt.type && "border-primary/50 bg-primary/5",
              loading && loadingType === opt.type && "border-primary/30"
            )}>
            <div className={cn("flex items-center gap-2 mb-3 transition-colors", activeType === opt.type ? "text-primary" : "text-muted-foreground group-hover:text-primary")}>
              {loading && loadingType === opt.type ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : opt.icon}
            </div>
            <p className="text-xs font-semibold text-foreground mb-1">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5" dir="rtl">{opt.descAr}</p>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass-card border border-primary/20 rounded-xl p-6 text-center animate-fade-in-up">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-foreground" dir="rtl">{loadingMsg}</p>
          <div className="w-48 h-1 bg-secondary rounded-full mx-auto mt-3 overflow-hidden">
            <div className="h-full bg-primary/50 rounded-full loading-shimmer" />
          </div>
        </div>
      )}

      {/* Results area */}
      {report && !loading && (
        <div className="glass-card border border-primary/20 rounded-xl p-6 animate-fade-in-up section-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary font-mono">
                {ANALYSIS_OPTIONS.find(o => o.type === activeType)?.label || "Analysis"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
          <div className="prose prose-sm prose-invert max-w-none [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_p]:text-sm [&_p]:text-foreground [&_li]:text-sm [&_li]:text-foreground [&_strong]:text-primary" dir="rtl">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Past reports */}
      {reports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground font-mono">PAST REPORTS</h4>
          {reports.slice(0, 5).map(r => {
            const isExpanded = expandedReports.has(r.id);
            const tStyle = r.threat_level ? getThreatStyle(r.threat_level) : null;
            return (
              <div key={r.id} className="glass-card border border-border/50 rounded-xl overflow-hidden">
                <button onClick={() => isExpanded ? toggleReport(r.id) : (() => { setReport(r.content || ""); setActiveType(r.report_type); toggleReport(r.id); })()}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground">{r.report_type.replace(/_/g, " ")}</span>
                    {tStyle && (
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", tStyle.bg, tStyle.color)}>
                        {tStyle.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </span>
                    {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && r.content && (
                  <div className="px-4 pb-4 border-t border-border/30">
                    <div className="prose prose-sm prose-invert max-w-none mt-3 [&_p]:text-sm [&_p]:text-foreground" dir="rtl">
                      <ReactMarkdown>{r.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
