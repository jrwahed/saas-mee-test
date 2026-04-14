import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_STYLES, TASK_STATUSES, CATEGORY_STYLES } from "./taskUtils";
import { Calendar, Brain, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  tasks: Tables<"tasks">[];
  onTaskClick: (task: Tables<"tasks">) => void;
}

export function TaskTableView({ tasks, onTaskClick }: Props) {
  const [sortField, setSortField] = useState<keyof Tables<"tasks"> | "created">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (sortField === "created") {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [tasks, sortField, sortAsc]);

  const handleSort = (field: keyof Tables<"tasks"> | "created") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getDueDateDisplay = (task: Tables<"tasks">) => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let text = due.toLocaleDateString("en", { month: "short", day: "numeric" });
    let color = "text-muted-foreground";
    
    if (diffDays < 0 && task.status !== "completed") {
      text = `OVERDUE`;
      color = "text-red-500 font-semibold";
    } else if (diffDays === 0) {
      text = "Today";
      color = "text-orange-500 font-semibold";
    } else if (diffDays === 1) {
      text = "Tomorrow";
      color = "text-yellow-500";
    } else if (diffDays <= 3) {
      text = `${diffDays}d left`;
      color = "text-yellow-500";
    }
    
    return <span className={cn("text-xs", color)}>{text}</span>;
  };

  const SortHeader = ({ field, children }: { field: keyof Tables<"tasks"> | "created"; children: React.ReactNode }) => (
    <TableHead
      onClick={() => handleSort(field)}
      className="cursor-pointer hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && <span className="text-xs">{sortAsc ? "↑" : "↓"}</span>}
      </div>
    </TableHead>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/40 hover:bg-secondary/40">
            <SortHeader field="title">Title</SortHeader>
            <SortHeader field="priority">Priority</SortHeader>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="assigned_to">Assigned To</SortHeader>
            <SortHeader field="category">Category</SortHeader>
            <SortHeader field="due_date">Due Date</SortHeader>
            <SortHeader field="estimated_hours">Est. Hours</SortHeader>
            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Score</th>
            <SortHeader field="created">Created</SortHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map(task => {
            const priorityStyle = PRIORITY_STYLES[task.priority || "medium"];
            const statusInfo = TASK_STATUSES.find(s => s.id === (task.status || "pending"));
            
            return (
              <TableRow
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                  {task.title}
                </TableCell>
                <TableCell>
                  {priorityStyle && (
                    <Badge variant="outline" className={cn("text-xs", priorityStyle.color)}>
                      {priorityStyle.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {statusInfo && (
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)} />
                      <span className="text-xs">{statusInfo.label}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {task.assigned_to ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                        {task.assigned_to.split("@")[0].slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-muted-foreground">{task.assigned_to.split("@")[0]}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.category && (
                    <Badge variant="outline" className={cn("text-xs", CATEGORY_STYLES[task.category] || "bg-secondary text-muted-foreground")}>
                      {task.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {getDueDateDisplay(task)}
                </TableCell>
                <TableCell>
                  {task.estimated_hours && (
                    <span className="text-xs text-muted-foreground">{task.estimated_hours}h</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.ai_score != null ? (
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3 text-primary" />
                      <span className={cn(
                        "text-xs font-semibold",
                        task.ai_score >= 80 ? "text-green-500" :
                        task.ai_score >= 60 ? "text-primary" :
                        task.ai_score >= 40 ? "text-yellow-500" : "text-red-500"
                      )}>{task.ai_score}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {task.created_at ? new Date(task.created_at).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      )}
    </div>
  );
}
