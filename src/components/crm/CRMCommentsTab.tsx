import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadComments } from "@/hooks/useLeadComments";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyManagers } from "@/lib/notifications";

function commentTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقائق`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعات`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} أيام`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric" });
}

interface Props {
  leadId: string;
  leadName?: string;
}

export function CRMCommentsTab({ leadId, leadName }: Props) {
  const { orgId, user, userName } = useAuth();
  const { comments, loading } = useLeadComments(leadId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim() || !orgId || !user) return;
    setSending(true);
    const { error } = await supabase.from("lead_comments").insert({
      lead_id: leadId,
      org_id: orgId,
      user_email: user.email || "",
      user_name: userName || user.email?.split("@")[0] || "User",
      comment: text.trim(),
    });
    setSending(false);
    if (error) { toast.error("Failed to add comment"); return; }
    // Notify managers about new comment
    if (orgId) {
      notifyManagers(orgId, "كومنت جديد", `كومنت على ${leadName || "ليد"}`, "comment", "/crm");
    }
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {(c.user_name || c.user_email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">{c.user_name || c.user_email}</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{commentTimeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">{c.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-border/30">
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="اكتب تعليق..."
            rows={2}
            className="resize-none flex-1 text-sm"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          />
          <Button
            size="sm"
            onClick={submit}
            disabled={!text.trim() || sending}
            className="self-end gap-1.5"
            style={{ backgroundColor: "#C8FF00", color: "#000" }}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
