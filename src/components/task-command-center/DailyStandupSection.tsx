import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { DailyStandup } from "@/hooks/useTaskCommandCenter";
import { format, isSameDay, parseISO, isToday, isFuture } from "date-fns";
import { CheckCircle, Clock, AlertCircle, Brain, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface DailyStandupSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  standup?: DailyStandup | null;
  weekDays: Date[];
  standups: DailyStandup[];
  refetch: () => void;
}

const MOOD_OPTIONS = [
  { value: "happy", emoji: "😄", label: "Great" },
  { value: "ok", emoji: "🙂", label: "Good" },
  { value: "stressed", emoji: "😓", label: "Stressed" },
  { value: "blocked", emoji: "🚫", label: "Blocked" },
];

export default function DailyStandupSection({
  selectedDate,
  onDateChange,
  standup,
  weekDays,
  standups,
  refetch,
}: DailyStandupSectionProps) {
  const { user } = useAuth();
  const [morningPlan, setMorningPlan] = useState(standup?.morning_plan || "");
  const [endOfDay, setEndOfDay] = useState(standup?.end_of_day || "");
  const [mood, setMood] = useState(standup?.mood || "");
  const [hours, setHours] = useState(standup?.hours_logged?.toString() || "");
  const [aiReview, setAiReview] = useState(standup?.ai_review);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const hasMorningPlan = !!standup?.morning_plan;
  const hasEndOfDay = !!standup?.end_of_day;
  const isTodaySelected = isToday(selectedDate);
  const isFutureDate = isFuture(selectedDate) && !isSameDay(selectedDate, new Date());

  const handleSaveMorningPlan = async () => {
    if (!morningPlan.trim()) {
      toast.error("Please enter a morning plan");
      return;
    }

    setIsSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const weekStartForDate = format(new Date(dateStr).setDate(new Date(dateStr).getDate() - new Date(dateStr).getDay()), "yyyy-MM-dd");
      
      await supabase.from("daily_standups").upsert({
        org_id: user?.orgId,
        user_id: user?.id,
        date: dateStr,
        week_start: weekStartForDate,
        morning_plan: morningPlan,
        updated_at: new Date().toISOString(),
      }, { onConflict: "org_id,user_id,date" });

      toast.success("Morning plan saved!");
      refetch();
    } catch (error) {
      toast.error("Failed to save morning plan");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEndOfDay = async () => {
    if (!endOfDay.trim()) {
      toast.error("Please enter an end of day summary");
      return;
    }

    setIsSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const weekStartForDate = format(new Date(dateStr).setDate(new Date(dateStr).getDate() - new Date(dateStr).getDay()), "yyyy-MM-dd");
      
      await supabase.from("daily_standups").upsert({
        org_id: user?.orgId,
        user_id: user?.id,
        date: dateStr,
        week_start: weekStartForDate,
        end_of_day: endOfDay,
        mood: mood,
        hours_logged: parseFloat(hours) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "org_id,user_id,date" });

      toast.success("End of day summary saved!");
      refetch();
    } catch (error) {
      toast.error("Failed to save end of day summary");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAiReview = async () => {
    setIsGeneratingAi(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const payload = {
        type: "daily_summary",
        data: {
          user_name: user?.email?.split("@")[0] || "User",
          user_email: user?.email,
          date: dateStr,
          tasks_count: 0,
          completed_count: 0,
          total_hours: parseFloat(hours) || 0,
          mood: mood,
          logs: [morningPlan, endOfDay].filter(Boolean),
        },
      };

      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: payload,
      });

      if (error) throw error;

      let result = data;
      if (data?.result) result = data.result;
      if (result?.raw) {
        try {
          result = JSON.parse(result.raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch {}
      }

      const aiReviewData = {
        productivity_score: result.productivity_score || result.score || 0,
        summary: result.summary || "",
        recommendations: result.recommendations || "",
      };

      // Save AI review to database
      const weekStartForDate = format(new Date(dateStr).setDate(new Date(dateStr).getDate() - new Date(dateStr).getDay()), "yyyy-MM-dd");
      await supabase.from("daily_standups").update({
        ai_review: aiReviewData,
        updated_at: new Date().toISOString(),
      }).eq("org_id", user?.orgId).eq("user_id", user?.id).eq("date", dateStr);

      setAiReview(aiReviewData);
      toast.success("AI review generated!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "AI review failed, please try again");
      console.error(error);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getDayStatus = (day: Date) => {
    const dayStandup = standups.find(s => isSameDay(parseISO(s.date), day));
    if (!dayStandup) return { hasPlan: false, hasEod: false, score: null };
    return {
      hasPlan: !!dayStandup.morning_plan,
      hasEod: !!dayStandup.end_of_day,
      score: dayStandup.ai_review?.productivity_score,
    };
  };

  return (
    <div className="space-y-6">
      {/* Day Selector Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weekDays.map((day) => {
          const status = getDayStatus(day);
          const isSelected = isSameDay(day, selectedDate);
          
          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              onClick={() => onDateChange(day)}
              className={`flex-shrink-0 p-3 rounded-lg border transition-all min-w-[100px] ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-medium">{format(day, "EEE")}</p>
              <p className="text-xs text-muted-foreground">{format(day, "MMM d")}</p>
              <div className="flex gap-1 mt-1">
                {status.hasPlan && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">Plan</span>
                )}
                {status.hasEod && (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded">Done</span>
                )}
              </div>
              {status.score !== null && (
                <div className={`mt-1 h-1.5 w-full rounded-full ${
                  status.score! >= 80 ? "bg-green-500" : status.score! >= 60 ? "bg-primary" : status.score! >= 40 ? "bg-yellow-500" : "bg-red-500"
                }`} style={{ width: `${status.score}%` }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Morning Plan & End of Day Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Morning Plan */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sunrise className="h-5 w-5 text-orange-400" />
              <Label className="text-base font-semibold">Morning Plan</Label>
            </div>
            {hasMorningPlan && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                Saved
              </Badge>
            )}
          </div>
          
          <Textarea
            value={morningPlan}
            onChange={(e) => setMorningPlan(e.target.value)}
            placeholder="What do you plan to accomplish today?"
            className="min-h-[150px] mb-4"
            disabled={isFutureDate}
          />
          
          <div className="flex gap-2">
            <Button onClick={handleSaveMorningPlan} disabled={isSaving || isFutureDate} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Plan
            </Button>
            <Button variant="outline" size="sm" disabled={isSaving || isFutureDate}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Draft
            </Button>
          </div>
        </Card>

        {/* End of Day */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sunset className="h-5 w-5 text-purple-400" />
              <Label className="text-base font-semibold">End of Day</Label>
            </div>
            {hasEndOfDay && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                Saved
              </Badge>
            )}
          </div>
          
          <Textarea
            value={endOfDay}
            onChange={(e) => setEndOfDay(e.target.value)}
            placeholder="What did you accomplish today?"
            className="min-h-[100px] mb-4"
            disabled={!isTodaySelected && !isSameDay(selectedDate, new Date()) && standup?.end_of_day}
          />
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Mood</Label>
              <div className="flex gap-2">
                {MOOD_OPTIONS.map((moodOption) => (
                  <button
                    key={moodOption.value}
                    onClick={() => setMood(moodOption.value)}
                    className={`p-2 rounded-lg transition-all ${
                      mood === moodOption.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    title={moodOption.label}
                  >
                    {moodOption.emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Hours Worked</Label>
              <Input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="8"
                className="w-full"
                min="0"
                max="24"
                step="0.5"
              />
            </div>
          </div>
          
          <Button onClick={handleSaveEndOfDay} disabled={isSaving} size="sm" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Summary
          </Button>
        </Card>
      </div>

      {/* AI Review Button & Results */}
      {(hasMorningPlan || hasEndOfDay) && (
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="text-center mb-6">
            <Button
              onClick={handleGenerateAiReview}
              disabled={isGeneratingAi}
              size="lg"
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              {isGeneratingAi ? (
                <>
                  <Brain className="h-5 w-5 mr-2 animate-pulse" />
                  Generating AI Review...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Generate AI Performance Review
                </>
              )}
            </Button>
          </div>

          {aiReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Productivity Score</p>
                  <p className={`text-4xl font-bold ${
                    aiReview.productivity_score >= 80 ? 'text-green-500' :
                    aiReview.productivity_score >= 60 ? 'text-primary' :
                    aiReview.productivity_score >= 40 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {aiReview.productivity_score}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>

              {aiReview.summary && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Summary
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{aiReview.summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {aiReview.recommendations && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Recommendations
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{aiReview.recommendations}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// Simple icons since we might not have them imported
function Sunrise({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v8M4.93 4.93l5.66 5.66M19.07 4.93l-5.66 5.66M23 22H1M16 18a4 4 0 1 1-8 0" />
    </svg>
  );
}

function Sunset({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 10V2M4.93 10.93l5.66-5.66M19.07 10.93l-5.66-5.66M2 22h20M16 18a4 4 0 1 0-8 0" />
    </svg>
  );
}
