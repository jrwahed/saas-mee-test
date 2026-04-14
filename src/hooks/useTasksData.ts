import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useTasksData() {
  const { orgId, user, userRole } = useAuth();
  
  // sales_rep sees only their tasks, everyone else sees all
  const isSalesRep = userRole === "sales_rep";
  
  return useQuery({
    queryKey: ["tasks", orgId, isSalesRep, user?.email],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      
      if (isSalesRep && user?.email) {
        query = query.eq("assigned_to", user.email);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useTaskLogs(taskId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["task_logs", orgId, taskId],
    queryFn: async () => {
      if (!orgId || !taskId) return [];
      const { data, error } = await supabase
        .from("task_logs")
        .select("*")
        .eq("org_id", orgId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId && !!taskId,
  });
}

export function useDailyLogs(date?: string) {
  const { orgId } = useAuth();
  const today = date || new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["task_logs_daily", orgId, today],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("task_logs")
        .select("*")
        .eq("org_id", orgId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useTaskAssignmentRules() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["task_assignment_rules", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("task_assignment_rules")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useDailySummaries(date?: string) {
  const { orgId } = useAuth();
  const today = date || new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["daily_summaries", orgId, today],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("daily_summaries")
        .select("*")
        .eq("org_id", orgId)
        .eq("summary_date", today);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}
