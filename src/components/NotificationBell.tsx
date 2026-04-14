import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Bell, UserPlus, ArrowRight, RefreshCw, AlertTriangle,
  CheckCircle, MessageCircle, Trophy, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  org_id: string;
  title: string | null;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user_email: string | null;
  link: string | null;
}

const typeConfig: Record<string, { Icon: typeof Bell; iconCls: string; bgCls: string }> = {
  status:       { Icon: CheckCircle,    iconCls: "text-green-400",  bgCls: "bg-green-500/10" },
  lead:         { Icon: UserPlus,       iconCls: "text-[#C8FF00]",  bgCls: "bg-[#C8FF00]/10" },
  assignment:   { Icon: ArrowRight,     iconCls: "text-blue-400",   bgCls: "bg-blue-500/10" },
  reassignment: { Icon: RefreshCw,      iconCls: "text-orange-400", bgCls: "bg-orange-500/10" },
  warning:      { Icon: AlertTriangle,  iconCls: "text-red-400",    bgCls: "bg-red-500/10" },
  comment:      { Icon: MessageCircle,  iconCls: "text-purple-400", bgCls: "bg-purple-500/10" },
  deal:         { Icon: Trophy,         iconCls: "text-yellow-400", bgCls: "bg-yellow-500/10" },
};

const defaultConfig = { Icon: Bell, iconCls: "text-muted-foreground", bgCls: "bg-muted" };

export function NotificationBell() {
  const { orgId, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const userEmail = user?.email || "";

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Calculate dropdown position from bell button
  const updatePosition = useCallback(() => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        const filtered = (data as Notification[]).filter(
          (n) => !n.user_email || n.user_email === userEmail
        );
        setNotifications(filtered);
      }
    };
    load();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `org_id=eq.${orgId}` },
        (payload) => {
          const n = payload.new as Notification;
          if (n.user_email && n.user_email !== userEmail) return;
          setNotifications((prev) => [n, ...prev].slice(0, 20));

          const toastBorderColor: Record<string, string> = {
            status: "#22c55e", lead: "#C8FF00", assignment: "#3b82f6",
            reassignment: "#f97316", warning: "#ef4444", comment: "#a855f7", deal: "#eab308",
          };
          toast(n.title || "إشعار جديد", {
            description: n.message,
            duration: 5000,
            style: { borderRight: `4px solid ${toastBorderColor[n.type] || "#6b7280"}` },
            action: n.link
              ? { label: "عرض", onClick: () => navigate(n.link!) }
              : undefined,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, userEmail]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bellRef.current && !bellRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Update position when opening
  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids).eq("org_id", orgId!);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id).eq("org_id", orgId!);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link && window.location.pathname !== n.link) {
      navigate(n.link);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return "منذ " + formatDistanceToNow(new Date(dateStr), { locale: ar, addSuffix: false });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — portaled to document.body */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-[380px] max-h-[450px] bg-card border border-border rounded-xl overflow-hidden"
          style={{
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-base font-bold text-foreground" dir="rtl">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Check className="h-3 w-3" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[390px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Bell className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-medium" dir="rtl">لا توجد إشعارات</p>
                <p className="text-xs text-muted-foreground/60" dir="rtl">ستظهر هنا عند حدوث أي تحديث</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = typeConfig[n.type] || defaultConfig;
                const Icon = cfg.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-right hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 ${
                      !n.is_read ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bgCls}`}>
                      <Icon className={`h-4 w-4 ${cfg.iconCls}`} />
                    </div>
                    <div className="flex-1 min-w-0" dir="rtl">
                      {n.title && (
                        <p className={`text-sm leading-snug ${!n.is_read ? "text-foreground font-bold" : "text-foreground font-medium"}`}>
                          {n.title}
                        </p>
                      )}
                      <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
