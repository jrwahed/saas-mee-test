import { GripVertical, User, Phone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcLeadScore, getScoreColor, timeAgo, stages } from "./crmUtils";
import type { Tables } from "@/integrations/supabase/types";
import type { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";

interface Props {
  lead: Tables<"leads">;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onClick: () => void;
}

export function CRMLeadCard({ lead, provided, snapshot, onClick }: Props) {
  const score = calcLeadScore(lead);
  const sc = getScoreColor(score);
  const stage = stages.find(s => s.id === (lead.status || "Qualified"));

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "bg-card border border-border rounded-xl p-3.5 card-glow hover:border-primary/20 transition-all cursor-pointer group",
        snapshot.isDragging && "shadow-xl ring-2 ring-primary/30 rotate-1"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div {...provided.dragHandleProps} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {(lead.name || "?").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.name || "Unknown"}</p>
          {lead.source && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{lead.source}</span>
          )}
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
          {score}
        </span>
      </div>

      {lead.phone && (
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          <Phone className="h-3 w-3" />{lead.phone}
        </p>
      )}
      {lead.project && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <FileText className="h-3 w-3" />{lead.project}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {lead.assigned_to && (
            <>
              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[11px] text-muted-foreground">{lead.assigned_to}</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
      </div>
    </div>
  );
}
