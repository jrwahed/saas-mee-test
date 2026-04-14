import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types
export interface Prospect {
  id: string;
  org_id: string;
  name: string;
  sector: string;
  size?: string | null;
  website?: string | null;
  social_links?: Record<string, string>;
  marketing_activity?: string | null;
  reason_for_selection?: string | null;
  ai_priority_score: number;
  status: 'prospect' | 'researched' | 'contacted' | 'converted';
  created_by?: string | null;
  converted_lead_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectResearch {
  id: string;
  prospect_id: string;
  org_id: string;
  company_summary?: string | null;
  marketing_behavior?: string | null;
  opportunity_insight?: string | null;
  suggested_event_idea?: string | null;
  ai_generated: boolean;
  created_at: string;
}

export interface DecisionMaker {
  id: string;
  prospect_id: string;
  org_id: string;
  name?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  phone?: string | null;
  personal_note?: string | null;
  created_at: string;
}

export interface OutreachMessage {
  id: string;
  prospect_id: string;
  org_id: string;
  decision_maker_id?: string | null;
  observation?: string | null;
  opportunity?: string | null;
  idea?: string | null;
  call_to_action?: string | null;
  full_message?: string | null;
  language: string;
  status: 'draft' | 'sent' | 'replied' | 'no_reply';
  sent_at?: string | null;
  follow_up_day_4?: string | null;
  follow_up_day_8?: string | null;
  follow_up_day_14?: string | null;
  follow_up_4_done: boolean;
  follow_up_8_done: boolean;
  follow_up_14_done: boolean;
  created_at: string;
}

// ==================== Prospects CRUD ====================

export function useProspects() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["prospects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useCreateProspect() {
  const { orgId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: Omit<Prospect, "id" | "org_id" | "created_by" | "created_at" | "updated_at">) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("prospects")
        .insert({
          ...prospect,
          org_id: orgId,
          created_by: user?.email,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
    },
  });
}

export function useUpdateProspect() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Prospect> }) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("prospects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("org_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prospect", id] });
    },
  });
}

export function useDeleteProspect() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", orgId] });
    },
  });
}

// ==================== Research ====================

export function useProspectResearch(prospectId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["prospect_research", orgId, prospectId],
    queryFn: async () => {
      if (!orgId || !prospectId) return null;
      const { data, error } = await supabase
        .from("prospect_research")
        .select("*")
        .eq("org_id", orgId)
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!prospectId,
  });
}

// ==================== Decision Makers ====================

export function useDecisionMakers(prospectId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["decision_makers", orgId, prospectId],
    queryFn: async () => {
      if (!orgId || !prospectId) return [];
      const { data, error } = await supabase
        .from("decision_makers")
        .select("*")
        .eq("org_id", orgId)
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId && !!prospectId,
  });
}

export function useCreateDecisionMaker() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dm: Omit<DecisionMaker, "id" | "org_id" | "created_at">) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("decision_makers")
        .insert({ ...dm, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["decision_makers", orgId, variables.prospect_id] });
    },
  });
}

export function useDeleteDecisionMaker() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase
        .from("decision_makers")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision_makers"] });
    },
  });
}

// ==================== Outreach Messages ====================

export function useOutreachMessages(prospectId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["outreach_messages", orgId, prospectId],
    queryFn: async () => {
      if (!orgId || !prospectId) return [];
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("*")
        .eq("org_id", orgId)
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId && !!prospectId,
  });
}

export function useCreateOutreachMessage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (msg: Omit<OutreachMessage, "id" | "org_id" | "created_at">) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("outreach_messages")
        .insert({ ...msg, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["outreach_messages", orgId, variables.prospect_id] });
    },
  });
}

export function useUpdateOutreachMessage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OutreachMessage> }) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("outreach_messages")
        .update(updates)
        .eq("id", id)
        .eq("org_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach_messages"] });
    },
  });
}

// ==================== Follow-up Reminders ====================

export function useFollowUpReminders() {
  const { orgId, user } = useAuth();
  const queryClient = useQueryClient();

  // يشتغل كل مرة يفتح المستخدم التطبيق
  useQuery({
    queryKey: ["follow_up_check", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      await checkFollowUps(orgId, user?.email);
      return true;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // Check every 5 minutes
  });

  async function checkFollowUps(orgId: string, userEmail?: string | null) {
    const now = new Date().toISOString();

    const checks = [
      { column: "follow_up_day_4", doneColumn: "follow_up_4_done", day: 4 },
      { column: "follow_up_day_8", doneColumn: "follow_up_8_done", day: 8 },
      { column: "follow_up_day_14", doneColumn: "follow_up_14_done", day: 14 },
    ];

    for (const check of checks) {
      const { data: messages, error } = await supabase
        .from("outreach_messages")
        .select("*, prospects(name)")
        .eq("org_id", orgId)
        .eq(check.doneColumn, false)
        .lte(check.column, now)
        .not(check.column, "is", null);

      if (error) {
        console.error("Error checking follow-ups:", error);
        continue;
      }

      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const companyName = (msg.prospects as any)?.name || "شركة";
          
          // Create notification
          await supabase.from("notifications").insert({
            org_id: orgId,
            user_email: userEmail,
            type: "lead",
            title: `تذكير متابعة — اليوم ${check.day}`,
            message: `حان وقت متابعة ${companyName} — اليوم ${check.day} من التواصل`,
            link: "/lead-engine",
            is_read: false,
          });
        }
      }
    }
  }
}
