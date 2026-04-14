import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProspects,
  useProspectResearch,
  useDecisionMakers,
  useCreateDecisionMaker,
  useDeleteDecisionMaker,
  Prospect,
  DecisionMaker,
} from "@/hooks/useLeadEngine";
import { Brain, Plus, Trash2, User, Lightbulb, TrendingUp, Building } from "lucide-react";

interface ResearchTabProps {
  onSelectProspect?: (prospect: Prospect) => void;
}

export function ResearchTab({ onSelectProspect }: ResearchTabProps) {
  const { data: prospects = [], isLoading: prospectsLoading } = useProspects();
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showAddDM, setShowAddDM] = useState(false);
  const [newDM, setNewDM] = useState({ name: "", title: "", linkedin_url: "", email: "", phone: "", personal_note: "" });

  const selectedProspect = prospects.find((p) => p.id === selectedProspectId);
  const { data: research, isLoading: researchLoading } = useProspectResearch(selectedProspectId || undefined);
  const { data: decisionMakers = [] } = useDecisionMakers(selectedProspectId || undefined);
  const createDM = useCreateDecisionMaker();
  const deleteDM = useDeleteDecisionMaker();
  const { orgId } = useAuth();

  const unresearchedProspects = prospects.filter((p) => p.status === "prospect");
  const researchedProspects = prospects.filter((p) => p.status === "researched" || p.status === "contacted");

  const handleAnalyze = async (prospectId: string) => {
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    setAnalyzingId(prospectId);
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

      const result = data.result || data;

      await supabase.from("prospects").update({
        ai_priority_score: result.ai_priority_score,
        status: "researched",
        updated_at: new Date().toISOString(),
      }).eq("id", prospectId);

      await supabase.from("prospect_research").insert({
        prospect_id: prospectId,
        org_id: orgId!,
        company_summary: result.company_summary,
        marketing_behavior: result.marketing_behavior,
        opportunity_insight: result.opportunity_insight,
        suggested_event_idea: result.suggested_event_idea,
        ai_generated: true,
      });

      // Add suggested decision makers
      if (result.decision_maker_titles && Array.isArray(result.decision_maker_titles)) {
        for (const title of result.decision_maker_titles.slice(0, 3)) {
          await supabase.from("decision_makers").insert({
            prospect_id: prospectId,
            org_id: orgId!,
            title: title,
          });
        }
      }

      toast.success("تم تحليل الشركة بنجاح");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل التحليل بالـ AI");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAddDM = async () => {
    if (!selectedProspectId || !newDM.name) {
      toast.error("الاسم مطلوب");
      return;
    }

    try {
      await createDM.mutateAsync({
        prospect_id: selectedProspectId,
        org_id: orgId!,
        ...newDM,
      });
      toast.success("تم إضافة صاحب القرار بنجاح");
      setNewDM({ name: "", title: "", linkedin_url: "", email: "", phone: "", personal_note: "" });
      setShowAddDM(false);
    } catch (error) {
      toast.error("حدث خطأ أثناء الإضافة");
    }
  };

  const handleDeleteDM = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await deleteDM.mutateAsync(id);
      toast.success("تم الحذف بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  if (prospectsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* unresearched Prospects */}
      {unresearchedProspects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              شركات تحتاج تحليل ({unresearchedProspects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {unresearchedProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="border border-border/50 rounded-lg p-3 bg-muted/30"
                >
                  <p className="font-medium text-sm mb-2">{prospect.name}</p>
                  <Badge variant="outline" className="text-xs mb-3">
                    {prospect.sector}
                  </Badge>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleAnalyze(prospect.id)}
                    disabled={analyzingId === prospect.id}
                  >
                    {analyzingId === prospect.id ? (
                      <>
                        <Brain className="h-3 w-3 mr-2 animate-pulse" />
                        جاري التحليل...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3 mr-2" />
                        تحليل بالـ AI
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Researched Prospects */}
      {researchedProspects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              الشركات المحللة ({researchedProspects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {researchedProspects.map((prospect) => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspectId(selectedProspectId === prospect.id ? null : prospect.id)}
                  className={`text-right p-3 rounded-lg border transition-all ${
                    selectedProspectId === prospect.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:bg-muted/30"
                  }`}
                >
                  <p className="font-medium text-sm">{prospect.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {prospect.status === "researched" ? "تم التحليل" : "تم التواصل"}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Prospect Details */}
      {selectedProspect && research && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{selectedProspect.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{selectedProspect.sector}</p>
              </div>
              <Badge className={selectedProspect.status === "researched" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}>
                {selectedProspect.status === "researched" ? "تم التحليل" : "تم التواصل"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Intel */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">ملخص الشركة</p>
                </div>
                <p className="text-sm text-muted-foreground">{research.company_summary}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">السلوك التسويقي</p>
                </div>
                <p className="text-sm text-muted-foreground">{research.marketing_behavior}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <p className="text-xs font-medium">فرصة تسويقية</p>
                </div>
                <p className="text-sm text-muted-foreground">{research.opportunity_insight}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <p className="text-xs font-medium">فكرة فعالية مقترحة</p>
                </div>
                <p className="text-sm text-muted-foreground">{research.suggested_event_idea}</p>
              </div>
            </div>

            {/* Decision Makers */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">أصحاب القرار</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAddDM(!showAddDM)}>
                  <Plus className="h-3 w-3 mr-1" />
                  إضافة
                </Button>
              </div>

              {showAddDM && (
                <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">الاسم *</Label>
                      <Input
                        value={newDM.name}
                        onChange={(e) => setNewDM({ ...newDM, name: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">المنصب</Label>
                      <Input
                        value={newDM.title}
                        onChange={(e) => setNewDM({ ...newDM, title: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">LinkedIn</Label>
                      <Input
                        value={newDM.linkedin_url}
                        onChange={(e) => setNewDM({ ...newDM, linkedin_url: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">الإيميل</Label>
                      <Input
                        value={newDM.email}
                        onChange={(e) => setNewDM({ ...newDM, email: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">الموبايل</Label>
                    <Input
                      value={newDM.phone}
                      onChange={(e) => setNewDM({ ...newDM, phone: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ملاحظة شخصية</Label>
                    <Textarea
                      value={newDM.personal_note}
                      onChange={(e) => setNewDM({ ...newDM, personal_note: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddDM}>حفظ</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddDM(false)}>إلغاء</Button>
                  </div>
                </div>
              )}

              {decisionMakers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أصحاب قرار مضافين</p>
              ) : (
                <div className="space-y-2">
                  {decisionMakers.map((dm) => (
                    <div key={dm.id} className="flex justify-between items-center p-2 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{dm.name || "غير مسمى"}</p>
                        {dm.title && <p className="text-xs text-muted-foreground">{dm.title}</p>}
                        {dm.linkedin_url && (
                          <a
                            href={dm.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteDM(dm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProspect && researchedProspects.length === 0 && unresearchedProspects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد شركات مضافة بعد</p>
        </div>
      )}
    </div>
  );
}
