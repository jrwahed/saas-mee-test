import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageAIBanner } from "@/components/PageAIBanner";
import { MoreHorizontal, Eye, Search, Megaphone } from "lucide-react";
import { useCampaignsData } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fmtNum, fmtCurrency, fmtDate } from "@/lib/formatters";

const statusClasses: Record<string, { cls: string; label: string }> = {
  active: { cls: "bg-success/15 text-success border border-success/30", label: "Active" },
  paused: { cls: "bg-warning/15 text-warning border border-warning/30", label: "Paused" },
  archived: { cls: "bg-muted text-muted-foreground border border-border", label: "Archived" },
  ended: { cls: "bg-muted text-muted-foreground border border-border", label: "Ended" },
};

interface CampaignRow {
  campaign_name: string;
  spend: number;
  leads_count: number;
  cpl: number;
  impressions: number;
  clicks: number;
  conversion_rate: number;
  status: string;
  date: string;
}

const Campaigns = () => {
  const { data: rawCampaigns = [], isLoading, error, refetch } = useCampaignsData();
  useRealtimeSubscription("campaigns_data", ["campaigns_data"], "campaigns-page-rt");
  const [search, setSearch] = useState("");
  const [detailCampaign, setDetailCampaign] = useState<CampaignRow | null>(null);

  const campaigns: CampaignRow[] = useMemo(() => {
    return rawCampaigns
      .map(c => ({
        campaign_name: c.campaign_name,
        spend: Number(c.spend) || 0,
        leads_count: Number(c.leads_count) || 0,
        cpl: Number(c.cpl) || 0,
        impressions: Number(c.impressions) || 0,
        clicks: Number(c.clicks) || 0,
        conversion_rate: Number(c.conversion_rate) || 0,
        status: c.status || "active",
        date: c.date,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rawCampaigns]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(c => c.campaign_name.toLowerCase().includes(q));
  }, [campaigns, search]);

  const totals = useMemo(() => {
    const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
    const totalLeads = filtered.reduce((s, c) => s + c.leads_count, 0);
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const totalImpressions = filtered.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = filtered.reduce((s, c) => s + c.clicks, 0);
    const avgConvRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalSpend, totalLeads, avgCpl, avgConvRate };
  }, [filtered]);

  if (error) {
    return (
      <DashboardLayout title="Campaigns" subtitle="All campaign performance data">
        <ErrorState message="Error loading campaign data" onRetry={refetch} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaigns" subtitle="All campaign performance data">
      <div className="page-fade-in">
        <PageAIBanner page="campaigns" />

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full h-9 bg-secondary border border-border rounded-xl pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center animate-fade-in-up">
                <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="h-10 w-10 text-muted-foreground/40 status-dot-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
              </div>
            ) : (
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {[
                      { label: "Campaign", align: "text-left" },
                      { label: "Date", align: "text-center" },
                      { label: "Status", align: "text-center" },
                      { label: "Spend", align: "text-right" },
                      { label: "Leads", align: "text-right" },
                      { label: "CPL", align: "text-right" },
                      { label: "Impressions", align: "text-right" },
                      { label: "Clicks", align: "text-right" },
                      { label: "", align: "" },
                    ].map((h, i) => (
                      <th key={i} className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 ${h.align}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const st = statusClasses[c.status] || statusClasses.active;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground text-left">{c.campaign_name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground text-center font-mono">{fmtDate(c.date)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-mono">{fmtCurrency(c.spend)}</td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-mono">{fmtNum(c.leads_count)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-mono font-semibold ${c.cpl > 0 && c.cpl < 420 ? "text-success" : c.cpl >= 420 ? "text-destructive" : "text-foreground"}`}>
                            {fmtCurrency(c.cpl)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-mono">{fmtNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-sm text-foreground text-right font-mono">{fmtNum(c.clicks)}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-secondary transition-colors"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailCampaign(c)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-secondary/20 border-t-2 border-primary/20">
                    <td className="px-4 py-3 text-sm font-bold text-primary text-left">Totals</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm font-bold text-primary text-right font-mono">{fmtCurrency(totals.totalSpend)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-primary text-right font-mono">{fmtNum(totals.totalLeads)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-primary text-right font-mono">{fmtCurrency(totals.avgCpl)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm font-bold text-primary text-right font-mono">{totals.avgConvRate.toFixed(2)}%</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Dialog open={!!detailCampaign} onOpenChange={open => !open && setDetailCampaign(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{detailCampaign?.campaign_name}</DialogTitle>
              <DialogDescription>Campaign performance details</DialogDescription>
            </DialogHeader>
            {detailCampaign && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { label: "Date", value: fmtDate(detailCampaign.date) },
                  { label: "Status", value: (statusClasses[detailCampaign.status] || statusClasses.active).label },
                  { label: "Spend", value: fmtCurrency(detailCampaign.spend) },
                  { label: "Leads", value: fmtNum(detailCampaign.leads_count) },
                  { label: "CPL", value: fmtCurrency(detailCampaign.cpl) },
                  { label: "Impressions", value: fmtNum(detailCampaign.impressions) },
                  { label: "Clicks", value: fmtNum(detailCampaign.clicks) },
                  { label: "Conversion", value: `${detailCampaign.conversion_rate.toFixed(2)}%` },
                ].map(item => (
                  <div key={item.label} className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground font-mono">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
