import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ClientOption {
  id: string;
  name: string;
}

interface ClientContextState {
  clients: ClientOption[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextState | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { orgId, userRole } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    const fetchClients = async () => {
      setIsLoading(true);
      // Get distinct client_ids from campaigns_data for this org
      const { data } = await supabase
        .from("campaigns_data")
        .select("client_id")
        .eq("org_id", orgId);

      if (data) {
        const uniqueIds = [...new Set(data.map(d => d.client_id))];
        // Fetch client names
        if (uniqueIds.length > 0) {
          const { data: clientsData } = await supabase
            .from("clients_safe")
            .select("id, name")
            .in("id", uniqueIds);
          if (clientsData) {
            setClients(clientsData.filter(c => c.id && c.name) as ClientOption[]);
          }
        }
      }
      setIsLoading(false);
    };

    fetchClients();
  }, [orgId]);

  return (
    <ClientContext.Provider value={{ clients, selectedClientId, setSelectedClientId, isLoading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) throw new Error("useClient must be used within ClientProvider");
  return context;
}
