import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPage, getDefaultPage } from "@/lib/roles";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, userRole, permissions } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check page access using effective permissions (handles custom overrides)
  if (userRole && !permissions.page_access.includes(location.pathname)) {
    return <Navigate to={getDefaultPage(userRole)} replace />;
  }

  return <>{children}</>;
}
