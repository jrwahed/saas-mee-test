import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Target } from "lucide-react";
import { useProspects, useFollowUpReminders } from "@/hooks/useLeadEngine";
import { ProspectsTab } from "@/components/lead-engine/ProspectsTab";
import { ResearchTab } from "@/components/lead-engine/ResearchTab";
import { OutreachTab } from "@/components/lead-engine/OutreachTab";
import { Prospect } from "@/hooks/useLeadEngine";

export default function LeadEngine() {
  const { data: prospects = [] } = useProspects();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // تشغيل نظام التنبيهات التلقائية
  useFollowUpReminders();

  // حساب العداد لتاب Outreach
  const outreachCount = prospects.filter(p =>
    p.status === 'researched' || p.status === 'contacted'
  ).length;

  const totalProspects = prospects.length;
  const researchedCount = prospects.filter(p => p.status === 'researched').length;
  const contactedCount = prospects.filter(p => p.status === 'contacted').length;
  const convertedCount = prospects.filter(p => p.status === 'converted').length;

  const handleAnalyzeProspect = (prospectId: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (prospect) {
      setSelectedProspect(prospect);
    }
  };

  return (
    <DashboardLayout
      title="Lead Engine"
      subtitle="نظام توليد العملاء — ابحث، حلّل، تواصل"
    >
      {/* Page Header with Icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Lead Engine</h1>
          <p className="text-xs text-muted-foreground">نظام توليد العملاء — ابحث، حلّل، تواصل</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">إجمالي الشركات</p>
          <p className="text-2xl font-bold">{totalProspects}</p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">تم تحليلها</p>
          <p className="text-2xl font-bold text-blue-400">{researchedCount}</p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">تم التواصل</p>
          <p className="text-2xl font-bold text-purple-400">{contactedCount}</p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">تحولت لـ CRM</p>
          <p className="text-2xl font-bold text-green-400">{convertedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prospects" className="space-y-4">
        <TabsList className="mb-6">
          <TabsTrigger value="prospects">🎯 الشركات المستهدفة</TabsTrigger>
          <TabsTrigger value="research">🔬 التحليل الذكي</TabsTrigger>
          <TabsTrigger value="outreach">
            📤 التواصل
            {outreachCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {outreachCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects">
          <ProspectsTab 
            onSelectProspect={setSelectedProspect}
            onAnalyzeProspect={handleAnalyzeProspect}
          />
        </TabsContent>

        <TabsContent value="research">
          <ResearchTab onSelectProspect={setSelectedProspect} />
        </TabsContent>

        <TabsContent value="outreach">
          <OutreachTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
