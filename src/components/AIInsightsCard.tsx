import {
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Brain,
} from "lucide-react";
import { useDashboardKPIs, useLeadsData } from "@/hooks/useDashboardData";

interface Insight {
  type: "critical" | "warning" | "info";
  title: string;
  body: string;
}

const typeStyles = {
  critical: {
    border: "border-l-destructive",
    bg: "bg-destructive/5",
    badge: "bg-destructive/15 text-destructive",
    icon: AlertTriangle,
    label: "Critical",
  },
  warning: {
    border: "border-l-warning",
    bg: "bg-warning/5",
    badge: "bg-warning/15 text-warning",
    icon: AlertCircle,
    label: "Warning",
  },
  info: {
    border: "border-l-primary",
    bg: "bg-primary/5",
    badge: "bg-primary/15 text-primary",
    icon: Lightbulb,
    label: "Insight",
  },
};

export function AIInsightsCard() {
  const { totalSpend, totalLeads, cpl, conversionRate, bestCampaign, isLoading } = useDashboardKPIs();
  const { data: leads = [] } = useLeadsData();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center min-h-[320px] card-glow">
        <div className="flex items-center gap-2 text-muted-foreground"><Brain className="h-5 w-5 animate-pulse" /><span className="text-sm">Analyzing data...</span></div>
      </div>
    );
  }

  const insights: Insight[] = [];

  // Best campaign by CPL
  if (bestCampaign) {
    insights.push({
      type: "info",
      title: "أفضل حملة (أقل CPL)",
      body: `"${bestCampaign.name}" بتكلفة ${bestCampaign.cpl.toLocaleString("en", { maximumFractionDigits: 0 })} EGP لكل ليد — أفضل أداء بين كل الحملات`,
    });
  }

  // CPL benchmark
  if (cpl > 420) {
    insights.push({ type: "critical", title: "تحذير CPL مرتفع", body: `متوسط CPL الحالي ${cpl.toLocaleString("en", { maximumFractionDigits: 0 })} EGP — أعلى من معيار السوق (420 EGP)` });
  } else if (cpl > 0) {
    insights.push({ type: "info", title: "CPL ضمن المعيار", body: `متوسط CPL الحالي ${cpl.toLocaleString("en", { maximumFractionDigits: 0 })} EGP — أفضل من معيار السوق (420 EGP)` });
  }

  // Conversion rate
  if (conversionRate > 0 && conversionRate < 5) {
    insights.push({ type: "critical", title: "نسبة تحويل منخفضة", body: `نسبة التحويل ${conversionRate.toFixed(1)}% — أقل من الحد الأدنى المقبول (5%)` });
  } else if (conversionRate >= 15) {
    insights.push({ type: "info", title: "نسبة تحويل ممتازة", body: `نسبة التحويل ${conversionRate.toFixed(1)}% — أعلى من المعدل` });
  } else if (conversionRate > 0) {
    insights.push({ type: "warning", title: "نسبة تحويل متوسطة", body: `نسبة التحويل ${conversionRate.toFixed(1)}% — يمكن تحسينها` });
  }

  // Leads status breakdown
  const statusCounts: Record<string, number> = {};
  leads.forEach(l => { const s = l.status || "جديد"; statusCounts[s] = (statusCounts[s] || 0) + 1; });
  const statusStr = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(" | ");
  if (leads.length > 0) {
    insights.push({ type: "info", title: "توزيع الليدز حسب الحالة", body: statusStr });
  }

  if (insights.length === 0) {
    insights.push({ type: "info", title: "لا توجد بيانات بعد", body: "أضف حملات وليدز لرؤية التحليلات الذكية هنا" });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
        </div>
        <span className="text-xs text-muted-foreground">{insights.length} insights</span>
      </div>
      <div className="p-4 space-y-3">
        {insights.map((insight, i) => {
          const style = typeStyles[insight.type];
          const Icon = style.icon;
          return (
            <div key={i} className={`border-l-[3px] ${style.border} ${style.bg} rounded-r-lg p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed" dir="rtl">{insight.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
