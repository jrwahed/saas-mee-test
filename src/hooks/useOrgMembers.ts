import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrgMember {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
}

export function useOrgMembers() {
  const { orgId } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_org_members_with_email");
      if (!error && data) {
        setMembers(data as OrgMember[]);
      }
      setLoading(false);
    };
    fetch();
  }, [orgId]);

  return { members, loading };
}
