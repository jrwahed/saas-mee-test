import { ChevronDown, Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/contexts/ClientContext";
import { ROLE_LABELS } from "@/lib/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
}

export function AppHeader({ title, subtitle, onMenuToggle }: AppHeaderProps) {
  const { userRole, isViewer } = useAuth();
  const { clients, selectedClientId, setSelectedClientId } = useClient();

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const canSwitchClient = userRole === "owner" || userRole === "super_admin";
  const roleInfo = ROLE_LABELS[userRole || "viewer"];

  return (
    <header className="relative z-50 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden">
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Viewer badge */}
          {isViewer && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border" dir="rtl">
              وضع العرض فقط
            </span>
          )}

          {/* Role badge */}
          {roleInfo && !isViewer && (
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border hidden sm:inline-block ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          )}

          {/* Client selector */}
          {canSwitchClient && clients.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors">
                  <span className="text-muted-foreground text-xs hidden sm:inline">Client:</span>
                  <span className="font-medium text-xs max-w-[120px] truncate">
                    {selectedClient?.name || "الكل"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={() => setSelectedClientId(null)}>
                  <span className={`text-sm ${!selectedClientId ? "font-bold text-primary" : ""}`}>الكل</span>
                </DropdownMenuItem>
                {clients.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => setSelectedClientId(c.id)}>
                    <span className={`text-sm ${selectedClientId === c.id ? "font-bold text-primary" : ""}`}>
                      {c.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : clients.length === 1 ? (
            <div className="hidden sm:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground text-xs">Client:</span>
              <span className="font-medium text-xs">{clients[0]?.name}</span>
            </div>
          ) : null}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications - hidden for viewer */}
          {!isViewer && <NotificationBell />}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </header>
  );
}
