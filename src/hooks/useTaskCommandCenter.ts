import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";

export interface DailyStandup {
  id: string;
  org_id: string;
  user_id: string;
  date: string;
  week_start: string;
  morning_plan: string | null;
  end_of_day: string | null;
  mood: string | null;
  hours_logged: number | null;
  ai_review: {
    productivity_score: number;
    summary: string;
    recommendations: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoals {
  id: string;
  org_id: string;
  user_id: string;
  week_start: string;
  goals: Array<{
    title: string;
    status: "not_started" | "in_progress" | "done";
    priority: "high" | "medium" | "low";
    expected_hours: number;
    actual_hours: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface StandupFile {
  id: string;
  org_id: string;
  user_id: string;
  week_start: string;
  day: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
}

export function useTaskCommandCenter(weekStart?: Date) {
  const { orgId, user } = useAuth();
  const queryClient = useQueryClient();

  // Calculate current week start (Sunday by default)
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

  // Fetch daily standups for the week
  const standupsQuery = useQuery({
    queryKey: ["daily_standups", orgId, user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from("daily_standups")
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .gte("week_start", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("week_start", format(currentWeekEnd, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data as DailyStandup[];
    },
    enabled: !!orgId && !!user?.id,
  });

  // Fetch weekly goals
  const goalsQuery = useQuery({
    queryKey: ["weekly_goals", orgId, user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("week_start", format(currentWeekStart, "yyyy-MM-dd"))
        .single();
      
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data as WeeklyGoals | null;
    },
    enabled: !!orgId && !!user?.id,
  });

  // Fetch standup files for the week
  const filesQuery = useQuery({
    queryKey: ["standup_files", orgId, user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from("standup_files")
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("week_start", format(currentWeekStart, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as StandupFile[];
    },
    enabled: !!orgId && !!user?.id,
  });

  // Mutation: Save/Update Morning Plan
  const saveMorningPlanMutation = useMutation({
    mutationFn: async ({ date, plan }: { date: string; plan: string }) => {
      if (!orgId || !user?.id) throw new Error("Missing auth");
      
      const today = parseISO(date);
      const weekStartForDate = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("daily_standups")
        .upsert({
          org_id: orgId,
          user_id: user.id,
          date: date,
          week_start: weekStartForDate,
          morning_plan: plan,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "org_id,user_id,date",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as DailyStandup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_standups"] });
    },
  });

  // Mutation: Save End of Day
  const saveEndOfDayMutation = useMutation({
    mutationFn: async ({ 
      date, 
      endOfDay, 
      mood, 
      hours 
    }: { 
      date: string; 
      endOfDay: string; 
      mood: string; 
      hours: number;
    }) => {
      if (!orgId || !user?.id) throw new Error("Missing auth");
      
      const today = parseISO(date);
      const weekStartForDate = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("daily_standups")
        .upsert({
          org_id: orgId,
          user_id: user.id,
          date: date,
          week_start: weekStartForDate,
          end_of_day: endOfDay,
          mood: mood,
          hours_logged: hours,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "org_id,user_id,date",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as DailyStandup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_standups"] });
    },
  });

  // Mutation: Generate AI Review
  const generateAiReviewMutation = useMutation({
    mutationFn: async ({ date }: { date: string }) => {
      if (!orgId || !user?.id) throw new Error("Missing auth");
      
      // Gather context for AI
      const { data: standupData } = await supabase
        .from("daily_standups")
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("date", date)
        .single();
      
      const payload = {
        type: "daily_summary",
        data: {
          user_name: user.email?.split("@")[0] || user.email || "User",
          user_email: user.email,
          date: date,
          tasks_count: 0, // Could be enhanced to fetch actual tasks
          completed_count: 0,
          total_hours: standupData?.hours_logged || 0,
          mood: standupData?.mood,
          logs: [
            standupData?.morning_plan,
            standupData?.end_of_day,
          ].filter(Boolean),
        },
      };
      
      const { data, error } = await supabase.functions.invoke("task-ai-analyze", {
        body: payload,
      });
      
      if (error) throw error;
      
      // Parse AI response
      let result = data;
      if (data?.result) result = data.result;
      if (result?.raw) {
        try {
          result = JSON.parse(result.raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch {
          // Keep as is
        }
      }
      
      // Save AI review to database
      const aiReview = {
        productivity_score: result.productivity_score || result.score || 0,
        summary: result.summary || "",
        recommendations: result.recommendations || "",
      };
      
      const { data: updatedStandup, error: updateError } = await supabase
        .from("daily_standups")
        .update({
          ai_review: aiReview,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("date", date)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return updatedStandup as DailyStandup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_standups"] });
    },
  });

  // Mutation: Save Weekly Goals
  const saveWeeklyGoalsMutation = useMutation({
    mutationFn: async ({ goals }: { goals: WeeklyGoals["goals"] }) => {
      if (!orgId || !user?.id) throw new Error("Missing auth");
      
      const { data, error } = await supabase
        .from("weekly_goals")
        .upsert({
          org_id: orgId,
          user_id: user.id,
          week_start: format(currentWeekStart, "yyyy-MM-dd"),
          goals: goals,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "org_id,user_id,week_start",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as WeeklyGoals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly_goals"] });
    },
  });

  // Mutation: Upload File
  const uploadFileMutation = useMutation({
    mutationFn: async ({ 
      file, 
      day, 
      tags, 
      notes 
    }: { 
      file: File; 
      day: string; 
      tags?: string[]; 
      notes?: string;
    }) => {
      if (!orgId || !user?.id) throw new Error("Missing auth");
      
      const dayDate = parseISO(day);
      const weekStartForDay = format(startOfWeek(dayDate, { weekStartsOn: 0 }), "yyyy-MM-dd");
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${weekStartForDay}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("standup-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("standup-files")
        .getPublicUrl(fileName);
      
      // Create DB record
      const { data, error: dbError } = await supabase
        .from("standup_files")
        .insert({
          org_id: orgId,
          user_id: user.id,
          week_start: weekStartForDay,
          day: day,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          tags: tags || [],
          notes: notes || null,
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      return data as StandupFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standup_files"] });
    },
  });

  // Derived KPIs
  const totalHoursThisWeek = standupsQuery.data?.reduce((sum, s) => sum + (s.hours_logged || 0), 0) || 0;
  const daysWithPlan = standupsQuery.data?.filter(s => s.morning_plan).length || 0;
  const daysWithEod = standupsQuery.data?.filter(s => s.end_of_day).length || 0;
  const avgAiScore = (() => {
    const scores = standupsQuery.data
      ?.filter(s => s.ai_review?.productivity_score)
      .map(s => s.ai_review!.productivity_score) || [];
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  return {
    // Data
    standups: standupsQuery.data || [],
    weeklyGoals: goalsQuery.data,
    files: filesQuery.data || [],
    
    // Week navigation
    currentWeekStart,
    currentWeekEnd,
    weekLabel: `${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}`,
    
    // KPIs
    totalHoursThisWeek,
    daysWithPlan,
    daysWithEod,
    avgAiScore,
    
    // Loading states
    isLoading: standupsQuery.isLoading || goalsQuery.isLoading || filesQuery.isLoading,
    
    // Mutations
    saveMorningPlan: saveMorningPlanMutation.mutateAsync,
    isSavingMorningPlan: saveMorningPlanMutation.isPending,
    
    saveEndOfDay: saveEndOfDayMutation.mutateAsync,
    isSavingEndOfDay: saveEndOfDayMutation.isPending,
    
    generateAiReview: generateAiReviewMutation.mutateAsync,
    isGeneratingAiReview: generateAiReviewMutation.isPending,
    
    saveWeeklyGoals: saveWeeklyGoalsMutation.mutateAsync,
    isSavingWeeklyGoals: saveWeeklyGoalsMutation.isPending,
    
    uploadFile: uploadFileMutation.mutateAsync,
    isUploadingFile: uploadFileMutation.isPending,
    
    // Refetch
    refetch: () => {
      standupsQuery.refetch();
      goalsQuery.refetch();
      filesQuery.refetch();
    },
  };
}
