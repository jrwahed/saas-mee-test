import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DailyStandup, WeeklyGoals } from "@/hooks/useTaskCommandCenter";
import { format, addDays } from "date-fns";
import { Target, Edit2, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface WeeklyOverviewProps {
  weekStart: Date;
  goals?: WeeklyGoals | null;
  standups: DailyStandup[];
}

export default function WeeklyOverview({ weekStart, goals, standups }: WeeklyOverviewProps) {
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [localGoals, setLocalGoals] = useState<Array<{
    title: string;
    status: "not_started" | "in_progress" | "done";
    priority: "high" | "medium" | "low";
    expected_hours: number;
    actual_hours: number;
  }>>(goals?.goals || []);

  const handleSaveGoals = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { useAuth } = await import("@/contexts/AuthContext");
      
      // Get auth context
      const authModule = await import("@/contexts/AuthContext");
      // We need to get this from a hook in the parent, but for now we'll use a workaround
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      
      // Get org_id from user metadata or a separate call
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();
      
      if (!userData) throw new Error("User profile not found");
      
      await supabase.from("weekly_goals").upsert({
        org_id: userData.org_id,
        user_id: user.id,
        week_start: weekStartStr,
        goals: localGoals,
        updated_at: new Date().toISOString(),
      }, { onConflict: "org_id,user_id,week_start" });

      toast.success("Weekly goals saved!");
      setIsEditingGoals(false);
    } catch (error) {
      toast.error("Failed to save goals");
      console.error(error);
    }
  };

  const addGoal = () => {
    setLocalGoals([
      ...localGoals,
      { title: "", status: "not_started", priority: "medium", expected_hours: 0, actual_hours: 0 },
    ]);
  };

  const updateGoal = (index: number, field: string, value: any) => {
    const updated = [...localGoals];
    updated[index] = { ...updated[index], [field]: value };
    setLocalGoals(updated);
  };

  const removeGoal = (index: number) => {
    setLocalGoals(localGoals.filter((_, i) => i !== index));
  };

  // Calculate weekly stats
  const totalHoursLogged = standups.reduce((sum, s) => sum + (s.hours_logged || 0), 0);
  const daysWithPlan = standups.filter(s => s.morning_plan).length;
  const daysWithEod = standups.filter(s => s.end_of_day).length;
  const avgScore = (() => {
    const scores = standups.filter(s => s.ai_review?.productivity_score).map(s => s.ai_review!.productivity_score);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  return (
    <div className="space-y-6">
      {/* Weekly Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Goals Set</p>
              <p className="text-xl font-bold">{goals?.goals?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Save className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plans Saved</p>
              <p className="text-xl font-bold">{daysWithPlan}/7</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">EOD Summaries</p>
              <p className="text-xl font-bold">{daysWithEod}/7</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-xl font-bold">{totalHoursLogged.toFixed(1)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Goals Panel */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Weekly Focus</h3>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          
          <Dialog open={isEditingGoals} onOpenChange={setIsEditingGoals}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                {goals?.goals?.length ? "Edit Goals" : "Add Goals"}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Weekly Goals</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {localGoals.map((goal, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Goal {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(index)}
                        disabled={localGoals.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Input
                      placeholder="Goal title..."
                      value={goal.title}
                      onChange={(e) => updateGoal(index, "title", e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <select
                          value={goal.status}
                          onChange={(e) => updateGoal(index, "status", e.target.value)}
                          className="w-full p-2 border rounded-md bg-background"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <select
                          value={goal.priority}
                          onChange={(e) => updateGoal(index, "priority", e.target.value)}
                          className="w-full p-2 border rounded-md bg-background"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Expected Hours</Label>
                        <Input
                          type="number"
                          value={goal.expected_hours}
                          onChange={(e) => updateGoal(index, "expected_hours", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Actual Hours</Label>
                        <Input
                          type="number"
                          value={goal.actual_hours}
                          onChange={(e) => updateGoal(index, "actual_hours", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {localGoals.length < 5 && (
                  <Button onClick={addGoal} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                )}
                
                <Button onClick={handleSaveGoals} className="w-full">
                  Save Goals
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {goals?.goals?.length ? (
          <div className="space-y-4">
            {goals.goals.map((goal, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{goal.title || `Goal ${index + 1}`}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={goal.priority === "high" ? "destructive" : goal.priority === "medium" ? "default" : "secondary"} className="text-xs">
                        {goal.priority}
                      </Badge>
                      <Badge variant={goal.status === "done" ? "default" : goal.status === "in_progress" ? "secondary" : "outline"} className="text-xs">
                        {goal.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Hours</p>
                    <p className="font-semibold">{goal.actual_hours} / {goal.expected_hours}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(goal.actual_hours / (goal.expected_hours || 1)) * 100} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((goal.actual_hours / (goal.expected_hours || 1)) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No goals set for this week yet.</p>
            <p className="text-sm">Click "Add Goals" to define your weekly focus.</p>
          </div>
        )}
      </Card>

      {/* Week Progress Summary */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4">Week at a Glance</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Daily Standups Completed</span>
              <span>{daysWithEod} / 7</span>
            </div>
            <Progress value={(daysWithEod / 7) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Average AI Score</span>
              <span className={avgScore >= 80 ? 'text-green-500' : avgScore >= 60 ? 'text-primary' : avgScore >= 40 ? 'text-yellow-500' : 'text-red-500'}>
                {avgScore}%
              </span>
            </div>
            <Progress value={avgScore} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Hours Logged</span>
              <span>{totalHoursLogged.toFixed(1)} hrs</span>
            </div>
            <Progress value={Math.min((totalHoursLogged / 40) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Based on 40-hour work week</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
