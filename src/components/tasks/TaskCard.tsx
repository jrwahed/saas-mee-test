import { cn } from "@/lib/utils";
import { getPriorityInfo, CATEGORY_STYLES } from "./taskUtils";
import { Calendar, Brain, Clock } from "lucide-react";
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
  
  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0 && task.status !== "completed") {
      return { text: "OVERDUE", color: "text-red-500 font-semibold animate-pulse" };
    } else if (diffDays === 0) {
      return { text: "Today", color: "text-orange-500 font-semibold" };
    } else if (diffDays === 1) {
      return { text: "Tomorrow", color: "text-yellow-500" };
    } else if (diffDays <= 3) {
      return { text: `${diffDays}d`, color: "text-yellow-500" };
    } else {
      return { text: due.toLocaleDateString("en", { month: "short", day: "numeric" }), color: "text-muted-foreground" };
    }
  };
  
  const dueDateDisplay = getDueDateDisplay();

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground truncate flex-1">{task.title}</p>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", priority.color)}>
          {priority.label}
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {task.category && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", CATEGORY_STYLES[task.category] || "bg-secondary text-muted-foreground")}>
            {task.category}
          </span>
        )}
        {dueDateDisplay && (
          <span className={cn("text-[10px] flex items-center gap-1", dueDateDisplay.color)}>
            <Calendar className="h-2.5 w-2.5" />
            {dueDateDisplay.text}
          </span>
        )}
        {task.ai_score != null && (
          <div className="flex items-center gap-0.5 bg-primary/10 rounded px-1">
            <Brain className="h-2.5 w-2.5 text-primary" />
            <span className={cn(
              "text-[10px] font-bold",
              task.ai_score >= 80 ? "text-green-500" :
              task.ai_score >= 60 ? "text-primary" :
              task.ai_score >= 40 ? "text-yellow-500" : "text-red-500"
            )}>{task.ai_score}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
        <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-[8px] font-bold text-primary">{initials}</span>
        </div>
        <div className="flex items-center gap-2">
          {task.estimated_hours && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{task.estimated_hours}h
            </span>
          )}
          {task.source === "ai_suggested" && (
            <Brain className="h-2.5 w-2.5 text-primary/50" />
          )}
        </div>
      </div>
    </div>
  );
}
