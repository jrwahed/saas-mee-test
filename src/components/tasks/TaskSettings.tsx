import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskAssignmentRules } from "@/hooks/useTasksData";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES } from "./taskUtils";

export function TaskSettings() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const { data: rules = [] } = useTaskAssignmentRules();
  const { members } = useOrgMembers();
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newMax, setNewMax] = useState(5);
  const [newSkill, setNewSkill] = useState(3);

  const handleAdd = async () => {
    if (!orgId || !newEmail) return;
    const { error } = await supabase.from("task_assignment_rules").insert({
      org_id: orgId, user_email: newEmail,
      categories: newCategories.length > 0 ? newCategories : null,
      max_concurrent_tasks: newMax, skill_level: newSkill,
    });
    if (error) toast.error("Error adding rule");
    else {
      toast.success("Rule added");
      setAdding(false); setNewEmail(""); setNewCategories([]); setNewMax(5); setNewSkill(3);
      queryClient.invalidateQueries({ queryKey: ["task_assignment_rules"] });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("task_assignment_rules").delete().eq("id", id);
    if (error) toast.error("Error deleting rule");
    else { toast.success("Rule deleted"); queryClient.invalidateQueries({ queryKey: ["task_assignment_rules"] }); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("task_assignment_rules").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["task_assignment_rules"] });
  };

  const toggleCategory = (cat: string) => setNewCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Auto-Assignment Rules</h3>
        <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
      </div>

      {adding && (
        <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-4 animate-fade-in-up">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Team Member</label>
            <select value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground">
              <option value="">Select...</option>
              {members.map(m => <option key={m.email} value={m.email}>{m.display_name || m.email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Categories</label>
            <div className="flex flex-wrap gap-2">
              {TASK_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                    newCategories.includes(cat) ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border")}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Tasks: {newMax}</label>
              <input type="range" min={1} max={15} value={newMax} onChange={e => setNewMax(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Skill Level</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setNewSkill(s)}>
                    <Star className={cn("h-5 w-5", s <= newSkill ? "text-yellow-400 fill-yellow-400" : "text-gray-600")} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newEmail} className="text-xs">Save Rule</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 animate-fade-in-up">
            <button onClick={() => handleToggle(rule.id, rule.is_active ?? true)}
              className={cn("w-3 h-3 rounded-full shrink-0", rule.is_active ? "bg-green-400" : "bg-gray-600")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{rule.user_email}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {rule.categories?.map(c => <span key={c} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>)}
                <span className="text-[10px] text-muted-foreground">Max: {rule.max_concurrent_tasks}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {rules.length === 0 && !adding && <p className="text-xs text-muted-foreground text-center py-6">No assignment rules configured.</p>}
      </div>

      {/* n8n webhook info */}
      <div className="bg-secondary/30 border border-border rounded-xl p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2">n8n Webhook Integration</h4>
        <p className="text-[10px] text-muted-foreground mb-2">Send tasks via REST API:</p>
        <code className="text-[10px] text-primary bg-secondary px-2 py-1 rounded block break-all">
          POST &#123;SUPABASE_URL&#125;/rest/v1/tasks
        </code>
        <p className="text-[10px] text-muted-foreground mt-2">
          Body: &#123; org_id, title, description, priority, category, source: &quot;n8n&quot;, source_ref &#125;
        </p>
      </div>
    </div>
  );
}
