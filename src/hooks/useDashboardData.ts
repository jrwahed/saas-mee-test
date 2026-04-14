import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/contexts/ClientContext";
import { useMemo } from "react";

const CAMPAIGN_COLS = "campaign_name,spend,leads_count,cpl,impressions,clicks,conversion_rate,status,date,client_id" as const;

export function useCampaignsData() {
  const { orgId } = useAuth();
  const { selectedClientId } = useClient();

  return useQuery({
    queryKey: ["campaigns_data", orgId, selectedClientId],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("campaigns_data")
        .select(CAMPAIGN_COLS)
        .eq("org_id", orgId)
        .order("date", { ascending: false });
      if (selectedClientId) query = query.eq("client_id", selectedClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useLeadsData(options?: { forCRM?: boolean }) {
  const { orgId, user, userName, userRole } = useAuth();
  const { selectedClientId } = useClient();
  const forCRM = options?.forCRM ?? false;
  // Only sales_rep should be filtered to their own leads, and only on CRM/Sales pages.
  // Dashboard/Reports/AI pages show aggregated org-wide data for all roles.
  const isSalesRep = userRole === "sales_rep";
  const shouldFilter = forCRM && isSalesRep;

  return useQuery({
    queryKey: ["leads", orgId, selectedClientId, shouldFilter, user?.email],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("leads")
        .select("*")
        .eq("org_id", orgId);
      if (selectedClientId) query = query.eq("client_id", selectedClientId);
      if (shouldFilter && user?.email) {
        query = query.or(`assigned_to.eq.${user.email},assigned_to.eq.${userName || ""}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useDashboardKPIs() {
  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError, refetch: refetchCampaigns } = useCampaignsData();
  const { data: leads = [], isLoading: leadsLoading, error: leadsError, refetch: refetchLeads } = useLeadsData();

  const kpis = useMemo(() => {
    const totalSpend = campaigns.reduce((sum, c) => sum + (Number(c.spend) || 0), 0);
    // Use campaign leads_count from Meta Ads (not leads table row count)
    const totalLeads = campaigns.reduce((sum, c) => sum + (Number(c.leads_count) || 0), 0);
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    const closedLeads = leads.filter((l) => l.status === "Sold / Closed Won").length;
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

    const dealsClosed = closedLeads;
    const revenue = dealsClosed * 500000;
    const avgCostPerSale = dealsClosed > 0 ? totalSpend / dealsClosed : 0;
    const roas = totalSpend > 0 ? revenue / totalSpend : 0;

    return { totalSpend, totalLeads, cpl, conversionRate, dealsClosed, revenue, avgCostPerSale, roas };
  }, [campaigns, leads]);

  const spendChartData = useMemo(() => {
    const spendByName: Record<string, { spend: number; leads: number }> = {};
    campaigns.forEach((c) => {
      if (!spendByName[c.campaign_name]) spendByName[c.campaign_name] = { spend: 0, leads: 0 };
      spendByName[c.campaign_name].spend += Number(c.spend) || 0;
      spendByName[c.campaign_name].leads += Number(c.leads_count) || 0;
    });
    return Object.entries(spendByName)
      .map(([name, d]) => ({ name, spend: d.spend, leads: d.leads, cpl: d.leads > 0 ? d.spend / d.leads : 0 }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);
  }, [campaigns]);

  const leadsChartData = useMemo(() => {
    const leadsByDate: Record<string, number> = {};
    campaigns.forEach((c) => {
      if (!c.date) return;
      leadsByDate[c.date] = (leadsByDate[c.date] || 0) + (Number(c.leads_count) || 0);
    });
    return Object.entries(leadsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, leads]) => ({
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        leads,
      }));
  }, [campaigns]);

  const bestCampaign = useMemo(() => {
    const withLeads = spendChartData.filter(c => c.leads > 0);
    return withLeads.length > 0 ? withLeads.reduce((a, b) => a.cpl < b.cpl ? a : b) : null;
  }, [spendChartData]);

  const error = campaignsError || leadsError;
  const refetch = () => { refetchCampaigns(); refetchLeads(); };

  return {
    ...kpis,
    spendChartData,
    leadsChartData,
    bestCampaign,
    isLoading: campaignsLoading || leadsLoading,
    error,
    refetch,
  };
}
