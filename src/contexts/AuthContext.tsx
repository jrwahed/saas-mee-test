import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { UserPermissions, getEffectivePermissions } from "@/lib/roles";

interface AuthState {
  session: Session | null;
  user: User | null;
  orgId: string | null;
  userRole: string | null;
  userName: string | null;
  loading: boolean;
  permissions: UserPermissions;
  isViewer: boolean;
  signOut: () => Promise<void>;
}

const defaultPerms: UserPermissions = {
  page_access: [],
  crm_see_all: false,
  crm_can_assign: false,
  crm_can_delete: false,
  crm_can_add: false,
  crm_see_all_comments: false,
  is_custom: false,
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPerms, setCustomPerms] = useState<UserPermissions | null>(null);

  const fetchOrgData = async () => {
    const [orgResult, roleResult] = await Promise.all([
      supabase.rpc("get_user_org_id"),
      supabase.rpc("get_user_role"),
    ]);

    if (orgResult.data) setOrgId(orgResult.data);
    const role = roleResult.data || null;
    setUserRole(role);

    // Fetch custom permissions
    const { data: permsData } = await supabase.rpc("get_user_permissions");
    if (permsData && Array.isArray(permsData) && permsData.length > 0) {
      setCustomPerms(permsData[0] as unknown as UserPermissions);
    } else {
      setCustomPerms(null);
    }
  };

  const fetchUserName = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User"
      );
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchOrgData();
            fetchUserName(session.user.id);
          }, 0);
        } else {
          setOrgId(null);
          setUserRole(null);
          setUserName(null);
          setCustomPerms(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrgData();
        fetchUserName(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setOrgId(null);
    setUserRole(null);
    setUserName(null);
    setCustomPerms(null);
  };

  const permissions = getEffectivePermissions(userRole, customPerms);
  const isViewer = userRole === "viewer" && !customPerms?.is_custom;

  return (
    <AuthContext.Provider value={{ session, user, orgId, userRole, userName, loading, permissions, isViewer, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
