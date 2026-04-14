import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskCommandCenter } from "@/hooks/useTaskCommandCenter";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, TrendingUp, Target } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import DailyStandupSection from "@/components/task-command-center/DailyStandupSection";
import WeeklyOverview from "@/components/task-command-center/WeeklyOverview";
import WeekFilesPanel from "@/components/task-command-center/WeekFilesPanel";
import { Card } from "@/components/ui/card";

export default function TaskCommandCenter() {
  const { user, userName, userRole } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  console.log("TASK PAGE LOADED - TaskCommandCenter rendering");
  
  const {
    standups,
    weeklyGoals,
    files,
    weekLabel,
    totalHoursThisWeek,
    daysWithPlan,
    daysWithEod,
    avgAiScore,
    isLoading,
    currentWeekStart,
    refetch,
  } = useTaskCommandCenter(weekStart);

  const handlePrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const handleNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const handleToday = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
    setSelectedDate(today);
  };

  // Get standup for selected date
  const selectedStandup = standups.find(s => isSameDay(parseISO(s.date), selectedDate));

  return (
    <DashboardLayout title="Task Command Center" subtitle="Manage tasks, standups & weekly performance">
      <div className="space-y-6">
        {/* Week Header */}
        <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{userName || user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole?.replace("_", " ")}</p>
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center min-w-[200px]">
                <p className="font-semibold text-foreground">Week {format(currentWeekStart, "w")}</p>
                <p className="text-sm text-muted-foreground">{weekLabel}</p>
              </div>
              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            {/* KPIs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hours:</span>
                <span className="font-semibold text-foreground">{totalHoursThisWeek.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Done:</span>
                <span className="font-semibold text-foreground">{daysWithEod}/{daysWithPlan}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI Score:</span>
                <span className={`font-semibold ${avgAiScore >= 80 ? 'text-green-500' : avgAiScore >= 60 ? 'text-primary' : avgAiScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {avgAiScore}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="standup" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="standup">Daily Standup</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Overview</TabsTrigger>
            <TabsTrigger value="files">Files & Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="standup" className="space-y-6">
            <DailyStandupSection
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              standup={selectedStandup}
              weekDays={eachDayOfInterval({ start: currentWeekStart, end: addWeeks(currentWeekStart, 1) - 1 })}
              standups={standups}
              refetch={refetch}
            />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <WeeklyOverview
              weekStart={currentWeekStart}
              goals={weeklyGoals}
              standups={standups}
            />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <WeekFilesPanel
              files={files}
              selectedDate={selectedDate}
              weekStart={currentWeekStart}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
