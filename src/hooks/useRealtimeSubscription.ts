import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Subscribes to real-time changes on a table filtered by org_id,
 * and invalidates the given query keys on any change.
 */
export function useRealtimeSubscription(
  table: string,
  queryKeys: string[],
  channelName?: string
) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(channelName || `${table}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, table, queryClient, channelName]);
}
