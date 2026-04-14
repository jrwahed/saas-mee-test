import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Brain,
  Sparkles,
  Megaphone,
  Users,
  ClipboardCheck,
  Trophy,
  GitBranch,
  FileText,
  Radar,
  LogOut,
  X,
  UsersRound,
} from "lucide-react";
import logo from "@/assets/mw-logo.svg";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Growth Brain", url: "/ai-brain", icon: Brain },
  { title: "AI Performance", url: "/ai-performance-marketing", icon: Sparkles },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Tasks", url: "/tasks", icon: ClipboardCheck },
  { title: "Sales", url: "/sales", icon: Trophy },
  { title: "Sales Pipeline", url: "/sales-pipeline", icon: GitBranch },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Intelligence", url: "/competitors", icon: Radar },
  { title: "Team", url: "/users", icon: UsersRound },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userName, userRole, permissions, signOut } = useAuth();

  const navItems = useMemo(() => {
    return allNavItems.filter(item => permissions.page_access.includes(item.url));
  }, [permissions]);

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside className="w-[240px] h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-sidebar-border flex items-center justify-between">
        <img src={logo} alt="MW Growth Systems" className="h-10 w-auto object-contain" />
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors lg:hidden">
          <X className="h-4 w-4 text-sidebar-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 stagger-children overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.url;
          return (
            <RouterNavLink
              key={item.title}
              to={item.url}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 animate-fade-in-up ${
                isActive
                  ? "nav-active rounded-l-none"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </RouterNavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{userName || user?.email}</p>
            <p className="text-[10px] text-muted-foreground truncate capitalize">{userRole || "Member"}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
