import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertTriangle, Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksData, useTaskAssignmentRules } from "@/hooks/useTasksData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskStandup } from "@/components/tasks/TaskStandup";
import { TaskPerformance } from "@/components/tasks/TaskPerformance";
import { TaskSettings } from "@/components/tasks/TaskSettings";
import { findBestAssignee } from "@/lib/taskAssignment";
import type { Tables } from "@/integrations/supabase/types";
import type { DropResult } from "@hello-pangea/dnd";

const Tasks = () => {
  const { orgId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useTasksData();
  const { data: rules = [] } = useTaskAssignmentRules();
  const { members } = useOrgMembers();
  useRealtimeSubscription("tasks", ["tasks"], "tasks-rt");
  useRealtimeSubscription("task_logs", ["task_logs", "task_logs_daily"], "task-logs-rt");

  const [selectedTask, setSelectedTask] = useState<Tables<"tasks"> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const isAdmin = ["owner", "super_admin"].includes(userRole || "");

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      completedToday: tasks.filter(t => t.status === "completed" && t.completed_at?.startsWith(today)).length,
      blocked: tasks.filter(t => t.status === "blocked").length,
      review: tasks.filter(t => t.status === "review").length,
    };
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !orgId) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) toast.error("Error updating task");
    else queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const handleTaskClick = (task: Tables<"tasks">) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleAddTask = async () => {
    if (!orgId || !newTitle.trim()) return;
    setAddingTask(true);
    const { error } = await supabase.from("tasks").insert({
      org_id: orgId, title: newTitle.trim(), status: "pending", source: "manual",
    });
    if (error) toast.error("Error creating task");
    else {
      toast.success("Task created");
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
    setAddingTask(false);
  };

  const handleAutoAssign = async () => {
    const pendingTasks = tasks.filter(t => t.status === "pending" && !t.assigned_to);
    if (pendingTasks.length === 0) { toast.info("No unassigned pending tasks"); return; }
    let assigned = 0;
    for (const task of pendingTasks) {
      const best = findBestAssignee(task, rules, tasks);
      if (best) {
        await supabase.from("tasks").update({
          assigned_to: best, assigned_by: "system", auto_assigned: true, status: "assigned",
          updated_at: new Date().toISOString(),
        }).eq("id", task.id);
        assigned++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast.success(`Auto-assigned ${assigned} task${assigned !== 1 ? "s" : ""}`);
  };

  // Workload per member
  const workload = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.filter(t => t.assigned_to && !["completed", "cancelled"].includes(t.status || "")).forEach(t => {
      counts[t.assigned_to!] = (counts[t.assigned_to!] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  const blockedTasks = tasks.filter(t => t.status === "blocked");

  return (
    <DashboardLayout title="Task Command Center" subtitle="Manage tasks, standups & team performance">
      <div className="page-fade-in space-y-6">
        <Tabs defaultValue="command" className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="command" className="text-xs">Command Center</TabsTrigger>
            <TabsTrigger value="standup" className="text-xs">Daily Standup</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="command" className="mt-6 space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: "Total", value: stats.total, color: "text-foreground" },
                { label: "Pending", value: stats.pending, color: "text-gray-400" },
                { label: "In Progress", value: stats.inProgress, color: "text-yellow-400" },
                { label: "Completed Today", value: stats.completedToday, color: "text-green-400" },
                { label: "Blocked", value: stats.blocked, color: "text-red-400" },
                { label: "In Review", value: stats.review, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border/50 rounded-xl p-3 text-center">
                  {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                    <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Main layout: Kanban + AI Pulse */}
            <div className="flex gap-6">
              {/* Kanban (main) */}
              <div className="flex-1 min-w-0">
                <TaskKanban tasks={tasks} isLoading={isLoading} onDragEnd={handleDragEnd} onTaskClick={handleTaskClick} />
              </div>

              {/* AI Pulse sidebar */}
              <div className="hidden lg:block w-[280px] shrink-0 space-y-4">
                {/* Quick add */}
                <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Quick Add Task</h4>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..."
                    onKeyDown={e => e.key === "Enter" && handleAddTask()}
                    className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  <Button size="sm" onClick={handleAddTask} disabled={addingTask || !newTitle.trim()} className="w-full gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Task
                  </Button>
                </div>

                {/* Auto-assign */}
                {rules.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleAutoAssign} className="w-full gap-1.5 text-xs">
                    <Brain className="h-3.5 w-3.5" /> Auto-Assign Pending
                  </Button>
                )}

                {/* Workload */}
                {workload.length > 0 && (
                  <div className="bg-card border border-border/50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-foreground mb-3">Team Workload</h4>
                    <div className="space-y-2">
                      {workload.map(([email, count]) => {
                        const max = Math.max(...workload.map(w => w[1]), 1);
                        return (
                          <div key={email} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[10px] text-muted-foreground truncate">{email.split("@")[0]}</span>
                              <span className="text-[10px] font-mono text-foreground">{count}</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Blockers */}
                {blockedTasks.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      <h4 className="text-xs font-semibold text-red-400">Blockers ({blockedTasks.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {blockedTasks.slice(0, 5).map(t => (
                        <button key={t.id} onClick={() => handleTaskClick(t)}
                          className="w-full text-left bg-red-500/5 rounded-lg p-2 hover:bg-red-500/10 transition-colors">
                          <p className="text-xs text-foreground truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.assigned_to?.split("@")[0] || "Unassigned"}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="standup" className="mt-6">
            <TaskStandup />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <TaskPerformance />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="mt-6">
              <TaskSettings />
            </TabsContent>
          )}
        </Tabs>

        <TaskDrawer task={selectedTask} open={drawerOpen} onOpenChange={setDrawerOpen}
          orgMembers={members} userRole={userRole} />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
