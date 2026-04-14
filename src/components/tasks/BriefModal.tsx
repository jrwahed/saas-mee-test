import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, PRIORITY_STYLES } from "./taskUtils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface AITask {
  title: string;
  description: string;
  category: string;
  priority: string;
  estimated_hours: number;
  order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BriefModal({ open, onOpenChange }: Props) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [creating, setCreating] = useState(false);
  
  const loadingMessages = ["جاري تحليل البريف...", "جاري تقسيم المهام...", "جاري تحديد الأولويات..."];
  
  const handleAiSplit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }
    
    setAiLoading(true);
    let msgIndex = 0;
    setLoadingMessage(loadingMessages[0]);
    
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[msgIndex]);
    }, 1500);
    
    try {
      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: {
          type: "split_brief",
          data: {
            title,
            description,
            deadline: deadline ? format(deadline, "yyyy-MM-dd") : undefined,
            notes,
          },
        },
      });
      
      clearInterval(interval);
      
      if (error) throw error;
      
      const content = data?.report || "";
      try {
        const parsed = JSON.parse(content);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          setAiTasks(parsed.tasks.map((t: AITask, i: number) => ({ ...t, order: i })));
          toast.success("Brief split successfully!");
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse AI response");
      }
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || "AI split failed");
    } finally {
      setAiLoading(false);
      setLoadingMessage("");
    }
  };
  
  const updateTask = (index: number, field: keyof AITask, value: any) => {
    setAiTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };
  
  const deleteTask = (index: number) => {
    setAiTasks(prev => prev.filter((_, i) => i !== index));
  };
  
  const addManualTask = () => {
    setAiTasks(prev => [...prev, {
      title: "New Task",
      description: "",
      category: "admin",
      priority: "medium",
      estimated_hours: 1,
      order: prev.length,
    }]);
  };
  
  const handleCreateAll = async () => {
    if (!orgId || aiTasks.length === 0) return;
    setCreating(true);
    
    try {
      const tasksToInsert = aiTasks.map(t => ({
        org_id: orgId,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        estimated_hours: t.estimated_hours,
        status: "pending",
        source: "ai_suggested",
        due_date: deadline ? deadline.toISOString() : null,
      }));
      
      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;
      
      toast.success(`Created ${aiTasks.length} tasks!`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Reset and close
      setTitle("");
      setDescription("");
      setClient("");
      setDeadline(undefined);
      setNotes("");
      setAiTasks([]);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create tasks");
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            New Brief → AI Split
          </DialogTitle>
          <DialogDescription>
            Enter your project brief and let AI split it into actionable tasks
          </DialogDescription>
        </DialogHeader>
        
        {aiTasks.length === 0 ? (
          <div className="space-y-4 py-4">
            <div>
              <Label>Brief Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Launch Ramadan Campaign"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the project, goals, deliverables..."
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client (optional)</Label>
                <Select value={client} onValueChange={setClient}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client</SelectItem>
                    {/* Could fetch clients here if needed */}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Final Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal h-10">
                      {deadline ? format(deadline, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any extra details, constraints, or requirements..."
                rows={2}
                className="mt-1"
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button
                onClick={handleAiSplit}
                disabled={aiLoading || !title.trim() || !description.trim()}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {aiLoading ? loadingMessage : "Split with AI ⚡"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-foreground font-medium">Preview: {aiTasks.length} tasks generated</p>
              <p className="text-xs text-muted-foreground mt-1">Edit tasks below before creating them</p>
            </div>
            
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {aiTasks.map((task, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-6">#{idx + 1}</span>
                    <input
                      value={task.title}
                      onChange={e => updateTask(idx, "title", e.target.value)}
                      className="flex-1 text-sm font-medium text-foreground bg-transparent border-none focus:outline-none"
                    />
                    <Button size="sm" variant="ghost" onClick={() => deleteTask(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  
                  <Textarea
                    value={task.description}
                    onChange={e => updateTask(idx, "description", e.target.value)}
                    placeholder="Task description..."
                    rows={2}
                    className="text-xs"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={task.category} onValueChange={v => updateTask(idx, "category", v)}>
                      <SelectTrigger className="h-7 text-xs w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={task.priority} onValueChange={v => updateTask(idx, "priority", v)}>
                      <SelectTrigger className="h-7 text-xs w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Hours:</Label>
                      <Input
                        type="number"
                        value={task.estimated_hours}
                        onChange={e => updateTask(idx, "estimated_hours", Number(e.target.value))}
                        className="h-7 w-16 text-xs"
                        step="0.5"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button variant="outline" size="sm" onClick={addManualTask} className="w-full gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Manual Task
            </Button>
            
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setAiTasks([])}>
                Back to Brief
              </Button>
              <Button
                onClick={handleCreateAll}
                disabled={creating || aiTasks.length === 0}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Create All Tasks
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
