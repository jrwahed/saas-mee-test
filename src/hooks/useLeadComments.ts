import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export function useLeadComments(leadId: string | null | undefined) {
  const { orgId } = useAuth();
  const [comments, setComments] = useState<Tables<"lead_comments">[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!leadId || !orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lead_comments")
      .select("*")
      .eq("lead_id", leadId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [leadId, orgId]);

  // Real-time subscription
  useEffect(() => {
    if (!leadId || !orgId) return;
    const channel = supabase
      .channel(`lead-comments-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_comments",
          filter: `lead_id=eq.${leadId}`,
        },
        () => fetchComments()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId, orgId]);

  return { comments, loading, refetch: fetchComments };
}

export function useLeadCommentCounts(leadIds: string[]) {
  const { orgId } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!orgId || leadIds.length === 0) return;
    const fetchCounts = async () => {
      const { data } = await supabase
        .from("lead_comments")
        .select("lead_id")
        .eq("org_id", orgId)
        .in("lead_id", leadIds);
      if (data) {
        const map: Record<string, number> = {};
        data.forEach(r => { map[r.lead_id!] = (map[r.lead_id!] || 0) + 1; });
        setCounts(map);
      }
    };
    fetchCounts();

    // Subscribe to changes for any of these leads
    const channel = supabase
      .channel("lead-comments-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_comments" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, leadIds.join(",")]);

  return counts;
}
