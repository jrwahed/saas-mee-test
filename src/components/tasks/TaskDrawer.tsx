import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Send, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskLogs } from "@/hooks/useTasksData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TASK_STATUSES, PRIORITY_STYLES, TASK_CATEGORIES, timeAgo } from "./taskUtils";
import type { Tables } from "@/integrations/supabase/types";
import type { OrgMember } from "@/hooks/useOrgMembers";

interface Props {
  task: Tables<"tasks"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgMembers: OrgMember[];
  userRole: string | null;
}

export function TaskDrawer({ task, open, onOpenChange, orgMembers, userRole }: Props) {
  const { orgId, user, userName } = useAuth();
  const queryClient = useQueryClient();
  const { data: logs = [] } = useTaskLogs(task?.id);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [logHours, setLogHours] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setStatus(task.status || "pending");
      setCategory(task.category || "");
      setAssignedTo(task.assigned_to || "");
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "");
      setEstimatedHours(task.estimated_hours?.toString() || "");
    }
  }, [task?.id, open]);

  const handleSave = async () => {
    if (!task || !orgId) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      title, description, priority, status, category,
      assigned_to: assignedTo || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed" && task.status !== "completed") {
      updates.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (error) toast.error("Error saving task");
    else {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
    setSaving(false);
  };

  const handleAddLog = async () => {
    if (!task || !orgId || !logContent.trim()) return;
    const { error } = await supabase.from("task_logs").insert({
      org_id: orgId, task_id: task.id,
      user_email: user?.email || "", user_name: userName || "",
      log_type: "update", content: logContent.trim(),
      hours_spent: logHours ? Number(logHours) : 0,
    });
    if (error) toast.error("Error adding log");
    else {
      toast.success("Log added");
      setLogContent(""); setLogHours("");
      queryClient.invalidateQueries({ queryKey: ["task_logs"] });
    }
  };

  const handleAiAnalyze = async () => {
    if (!task) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: { type: "evaluate_task", data: { task, logs } },
      });
      if (error) throw error;
      const content = data?.report || "";
      try {
        const parsed = JSON.parse(content);
        if (parsed.score != null) {
          await supabase.from("tasks").update({ ai_score: parsed.score, ai_feedback: parsed.feedback || content }).eq("id", task.id);
        }
      } catch {
        await supabase.from("tasks").update({ ai_feedback: content }).eq("id", task.id);
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("AI analysis complete");
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    }
    setAiLoading(false);
  };

  const canManage = ["owner", "super_admin", "sales_manager", "marketing_manager"].includes(userRole || "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">{task?.title || "Task"}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-xs">Activity</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canManage}
                className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} disabled={!canManage}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} disabled={!canManage}
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground">
                  {Object.entries(PRIORITY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} disabled={!canManage}
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground">
                  {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} disabled={!canManage}
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground">
                  <option value="">None</option>
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned To</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={!canManage}
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground">
                  <option value="">Unassigned</option>
                  {orgMembers.map(m => <option key={m.email} value={m.email}>{m.display_name || m.email}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={!canManage}
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Est. Hours</label>
                <input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} disabled={!canManage} step="0.5"
                  className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving || !canManage} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <input value={logContent} onChange={e => setLogContent(e.target.value)} placeholder="Add update..."
                className="flex-1 h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input value={logHours} onChange={e => setLogHours(e.target.value)} placeholder="hrs" type="number" step="0.5"
                className="w-16 h-9 bg-secondary border border-border rounded-lg px-2 text-sm text-foreground text-center" />
              <Button size="sm" onClick={handleAddLog} disabled={!logContent.trim()}><Send className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="space-y-3">
              {logs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>}
              {logs.map(log => (
                <div key={log.id} className="border-l-2 border-border pl-3 py-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{log.user_name || log.user_email}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                    {log.hours_spent ? <span className="text-[10px] text-primary flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{log.hours_spent}h</span> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{log.content}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {task?.ai_score != null && (
              <div className="flex items-center justify-center py-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                      strokeDasharray={`${((task.ai_score || 0) / 100) * 264} 264`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{task.ai_score}</span>
                  </div>
                </div>
              </div>
            )}
            {task?.ai_feedback && (
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <p className="text-sm text-foreground leading-relaxed" dir="rtl">{task.ai_feedback}</p>
              </div>
            )}
            {!task?.ai_feedback && !task?.ai_score && (
              <div className="text-center py-8">
                <Brain className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No AI analysis yet</p>
              </div>
            )}
            <Button onClick={handleAiAnalyze} disabled={aiLoading} className="w-full gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {aiLoading ? "Analyzing..." : task?.ai_score ? "Re-analyze" : "Analyze Task"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
