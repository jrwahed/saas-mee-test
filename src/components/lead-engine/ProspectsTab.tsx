import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProspects,
  useUpdateProspect,
  useDeleteProspect,
  Prospect,
} from "@/hooks/useLeadEngine";
import { Brain, Trash2, Edit2, Search } from "lucide-react";
import { AddProspectModal } from "./AddProspectModal";

interface ProspectsTabProps {
  onSelectProspect?: (prospect: Prospect) => void;
  onAnalyzeProspect?: (prospectId: string) => void;
}

const SECTOR_LABELS: Record<string, string> = {
  fmcg: "FMCG",
  telecom: "اتصالات",
  banking: "بنوك",
  real_estate: "عقارات",
  auto: "سيارات",
  education: "تعليم",
  other: "أخرى",
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  researched: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  converted: "bg-green-500/15 text-green-400 border-green-500/30",
};

export function ProspectsTab({ onSelectProspect, onAnalyzeProspect }: ProspectsTabProps) {
  const { data: prospects = [], isLoading } = useProspects();
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const sectors = ["all", "fmcg", "telecom", "banking", "real_estate", "auto", "education", "other"];

  const filteredProspects = prospects.filter((p) => {
    const matchesSector = selectedSector === "all" || p.sector === selectedSector;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reason_for_selection?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  const handleAnalyze = async (prospect: Prospect) => {
    try {
      const { data, error } = await supabase.functions.invoke("lead-engine-ai", {
        body: {
          type: "analyze_prospect",
          data: {
            name: prospect.name,
            sector: prospect.sector,
            website: prospect.website,
            marketing_activity: prospect.marketing_activity,
            country: "مصر",
          },
        },
      });

      if (error) throw error;

      const result = JSON.parse(data.report);
      
      // Update prospect with AI score
      await updateProspect.mutateAsync({
        id: prospect.id,
        updates: { ai_priority_score: result.ai_priority_score },
      });

      // Create research record
      await supabase.from("prospect_research").insert({
        prospect_id: prospect.id,
        org_id: prospect.org_id,
        company_summary: result.company_summary,
        marketing_behavior: result.marketing_behavior,
        opportunity_insight: result.opportunity_insight,
        suggested_event_idea: result.suggested_event_idea,
        ai_generated: true,
      });

      // Update status to researched
      await updateProspect.mutateAsync({
        id: prospect.id,
        updates: { status: "researched" },
      });

      toast.success("تم تحليل الشركة بنجاح");
      if (onAnalyzeProspect) onAnalyzeProspect(prospect.id);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل التحليل بالـ AI");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشركة؟")) return;
    try {
      await deleteProspect.mutateAsync(id);
      toast.success("تم الحذف بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 71) return "bg-green-500";
    if (score >= 41) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="لا توجد شركات مستهدفة بعد"
          description="ابدأ بإضافة شركة مستهدفة أولى"
          icon={Brain}
        />
        <div className="flex justify-center">
          <Button onClick={() => setAddModalOpen(true)}>
            + إضافة شركة
          </Button>
        </div>
        <AddProspectModal open={addModalOpen} onOpenChange={setAddModalOpen} onAnalyze={onAnalyzeProspect} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">إجمالي الشركات</p>
          <p className="text-2xl font-bold">{prospects.length}</p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">تم تحليلها</p>
          <p className="text-2xl font-bold text-blue-400">
            {prospects.filter((p) => p.status === "researched").length}
          </p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">تم التواصل</p>
          <p className="text-2xl font-bold text-purple-400">
            {prospects.filter((p) => p.status === "contacted").length}
          </p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">تحولت لـ Leads</p>
          <p className="text-2xl font-bold text-green-400">
            {prospects.filter((p) => p.status === "converted").length}
          </p>
        </div>
      </div>

      {/* Sector Filter */}
      <div className="flex flex-wrap gap-2">
        {sectors.map((sector) => (
          <Button
            key={sector}
            variant={selectedSector === sector ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSector(sector)}
            className="text-xs"
          >
            {sector === "all" ? "الكل" : SECTOR_LABELS[sector] || sector}
          </Button>
        ))}
      </div>

      {/* Search and Add */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم الشركة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          + إضافة شركة
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">الشركة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">القطاع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">الحجم</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">AI Score</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredProspects.map((prospect) => (
              <tr
                key={prospect.id}
                className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelectProspect?.(prospect)}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{prospect.name}</p>
                    {prospect.website && (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {prospect.website}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">
                    {SECTOR_LABELS[prospect.sector] || prospect.sector}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {prospect.size ? (
                    <Badge variant="outline" className="text-xs">
                      {prospect.size === "small" ? "صغيرة" : prospect.size === "medium" ? "متوسطة" : "كبيرة"}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreColor(prospect.ai_priority_score)}`}
                        style={{ width: `${prospect.ai_priority_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{prospect.ai_priority_score}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${STATUS_COLORS[prospect.status] || STATUS_COLORS.prospect}`}>
                    {prospect.status === "prospect" ? "مستهدف" :
                     prospect.status === "researched" ? "تم التحليل" :
                     prospect.status === "contacted" ? "تم التواصل" : "تحول"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleAnalyze(prospect)}
                      title="تحليل بالـ AI"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(prospect.id)}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddProspectModal open={addModalOpen} onOpenChange={setAddModalOpen} onAnalyze={onAnalyzeProspect} />
    </div>
  );
}
