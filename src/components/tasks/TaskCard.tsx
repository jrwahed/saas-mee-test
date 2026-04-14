import { cn } from "@/lib/utils";
import { getPriorityInfo, CATEGORY_STYLES } from "./taskUtils";
import { Calendar, Brain } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  task: Tables<"tasks">;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: Props) {
  const priority = getPriorityInfo(task.priority || "medium");
  const initials = task.assigned_to
    ? task.assigned_to.split("@")[0].slice(0, 2).toUpperCase()
    : "?";
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground truncate flex-1">{task.title}</p>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", priority.color)}>
          {priority.label}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {task.category && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", CATEGORY_STYLES[task.category] || "bg-secondary text-muted-foreground")}>
            {task.category}
          </span>
        )}
        {task.due_date && (
          <span className={cn("text-[10px] flex items-center gap-1", isOverdue ? "text-red-400" : "text-muted-foreground")}>
            <Calendar className="h-2.5 w-2.5" />
            {new Date(task.due_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        )}
        {task.ai_score != null && (
          <span className="text-[10px] flex items-center gap-0.5 text-primary">
            <Brain className="h-2.5 w-2.5" />
            {task.ai_score}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-[8px] font-bold text-primary">{initials}</span>
        </div>
        {task.estimated_hours && (
          <span className="text-[10px] text-muted-foreground">{task.estimated_hours}h est.</span>
        )}
      </div>
    </div>
  );
}
