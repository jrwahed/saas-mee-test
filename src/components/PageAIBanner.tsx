import { Sparkles } from "lucide-react";
import { useCampaignsData, useLeadsData } from "@/hooks/useDashboardData";
import { useMemo } from "react";

interface PageAIBannerProps {
  page: "dashboard" | "campaigns" | "crm" | "deal-tracker" | "sales" | "quality" | "intelligence";
}

export function PageAIBanner({ page }: PageAIBannerProps) {
  const { data: campaigns = [] } = useCampaignsData();
  const { data: leads = [] } = useLeadsData();

  const insight = useMemo(() => {
    switch (page) {
      case "dashboard": {
        if (campaigns.length === 0) return "ابدأ حملتك الأولى وسيبدأ AI Brain في التحليل";
        const byName: Record<string, { spend: number; leads: number }> = {};
        campaigns.forEach(c => {
          if (!byName[c.campaign_name]) byName[c.campaign_name] = { spend: 0, leads: 0 };
          byName[c.campaign_name].spend += Number(c.spend) || 0;
          byName[c.campaign_name].leads += Number(c.leads_count) || 0;
        });
        const withCpl = Object.entries(byName)
          .filter(([, v]) => v.leads > 0)
          .map(([name, v]) => ({ name, cpl: v.spend / v.leads }));
        const best = withCpl.sort((a, b) => a.cpl - b.cpl)[0];
        return best
          ? `أفضل حملة: "${best.name}" بتكلفة ${best.cpl.toLocaleString("en", { maximumFractionDigits: 0 })} EGP لكل ليد`
          : "ابدأ حملتك الأولى وسيبدأ AI Brain في التحليل";
      }
      case "campaigns": {
        if (campaigns.length === 0) return "ابدأ حملتك الأولى وسيبدأ AI Brain في التحليل";
        const byName: Record<string, { spend: number; leads: number }> = {};
        campaigns.forEach(c => {
          if (!byName[c.campaign_name]) byName[c.campaign_name] = { spend: 0, leads: 0 };
          byName[c.campaign_name].spend += Number(c.spend) || 0;
          byName[c.campaign_name].leads += Number(c.leads_count) || 0;
        });
        const withCpl = Object.entries(byName).filter(([, v]) => v.leads > 0).map(([name, v]) => ({ name, cpl: v.spend / v.leads }));
        const best = withCpl.sort((a, b) => a.cpl - b.cpl)[0];
        return best ? `أفضل CPL في حملة "${best.name}" — ${best.cpl.toFixed(0)} EGP` : "ابدأ حملتك الأولى وسيبدأ AI Brain في التحليل";
      }
      case "crm": {
        const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
        const stale = leads.filter(l => l.status === "جديد" && l.created_at && new Date(l.created_at).getTime() < twoDaysAgo);
        return stale.length > 0
          ? `${stale.length} ليدز لم يتم التواصل معهم منذ 48 ساعة`
          : "All new leads have been contacted within 48 hours ✓";
      }
      case "deal-tracker": {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const stuck = leads.filter(l => l.status === "قيد المتابعة" && l.updated_at && new Date(l.updated_at).getTime() < sevenDaysAgo);
        return stuck.length > 0
          ? `${stuck.length} صفقات في مرحلة قيد المتابعة منذ أكثر من 7 أيام`
          : "No deals stuck in follow-up stage";
      }
      default:
        return "AI monitoring active";
    }
  }, [page, campaigns, leads]);

  return (
    <div className="mb-6 rounded-xl border border-primary/15 bg-primary/5 p-3">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-primary shrink-0">AI Insight</span>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-xs text-foreground truncate" dir="rtl">{insight}</span>
      </div>
    </div>
  );
}
