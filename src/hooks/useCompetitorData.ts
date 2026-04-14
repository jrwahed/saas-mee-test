import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useCompetitors() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["competitors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("competitors")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 60000,
  });
}

export function useCompetitorIntel(competitorId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["competitor_intel", orgId, competitorId],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("competitor_intel")
        .select("*")
        .eq("org_id", orgId)
        .order("captured_at", { ascending: false })
        .limit(100);
      if (competitorId) query = query.eq("competitor_id", competitorId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 60000,
  });
}

export function useCompetitorReports() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["competitor_reports", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("competitor_reports")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useMarketBenchmarks() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["market_benchmarks", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("market_benchmarks")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}
