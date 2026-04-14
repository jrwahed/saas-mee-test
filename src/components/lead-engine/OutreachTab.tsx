import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProspects,
  useProspectResearch,
  useDecisionMakers,
  useOutreachMessages,
  useCreateOutreachMessage,
  useUpdateOutreachMessage,
  Prospect,
} from "@/hooks/useLeadEngine";
import { Brain, Send, CheckCircle, Clock, AlertCircle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OutreachTab() {
  const { data: prospects = [] } = useProspects();
  const { orgId, user } = useAuth();
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState({ observation: "", opportunity: "", idea: "", call_to_action: "" });
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [leadData, setLeadData] = useState({ name: "", email: "", phone: "", company: "", project: "" });

  const selectedProspect = prospects.find((p) => p.id === selectedProspectId);
  const { data: research } = useProspectResearch(selectedProspectId || undefined);
  const { data: decisionMakers = [] } = useDecisionMakers(selectedProspectId || undefined);
  const { data: messages = [] } = useOutreachMessages(selectedProspectId || undefined);
  const createMessage = useCreateOutreachMessage();
  const updateMessage = useUpdateOutreachMessage();

  const eligibleProspects = prospects.filter((p) => 
    p.status === "researched" || p.status === "contacted"
  );

  const handleGenerateMessage = async () => {
    if (!selectedProspect || !research) return;

    setGenerating(true);
    try {
      const dm = decisionMakers[0];
      const { data, error } = await supabase.functions.invoke("lead-engine-ai", {
        body: {
          type: "generate_message",
          data: {
            company_name: selectedProspect.name,
            decision_maker_name: dm?.name || null,
            decision_maker_title: dm?.title || null,
            opportunity_insight: research.opportunity_insight || "",
            suggested_event_idea: research.suggested_event_idea || "",
            language: "ar",
          },
        },
      });

      if (error) throw error;

      const result = data.result || data;

      // Parse AI response if wrapped in raw property or markdown
      let finalResult = result;
      if (result?.raw) {
        try {
          finalResult = JSON.parse(result.raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch {
          finalResult = result;
        }
      }

      setMessageDraft({
        observation: finalResult.observation,
        opportunity: finalResult.opportunity,
        idea: finalResult.idea,
        call_to_action: finalResult.call_to_action,
      });

      toast.success("تم توليد الرسالة بنجاح");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل توليد الرسالة");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!selectedProspectId) return;

    const fullMessage = `
${messageDraft.observation}

${messageDraft.opportunity}

${messageDraft.idea}

${messageDraft.call_to_action}
    `.trim();

    try {
      await createMessage.mutateAsync({
        prospect_id: selectedProspectId,
        org_id: orgId!,
        decision_maker_id: decisionMakers[0]?.id || null,
        observation: messageDraft.observation,
        opportunity: messageDraft.opportunity,
        idea: messageDraft.idea,
        call_to_action: messageDraft.call_to_action,
        full_message: fullMessage,
        language: "ar",
        status: "draft",
        follow_up_4_done: false,
        follow_up_8_done: false,
        follow_up_14_done: false,
      });

      toast.success("تم حفظ المسودة بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleSendMessage = async (messageId: string) => {
    try {
      const now = new Date().toISOString();
      const day4 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const day8 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
      const day14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      await updateMessage.mutateAsync({
        id: messageId,
        updates: {
          status: "sent",
          sent_at: now,
          follow_up_day_4: day4,
          follow_up_day_8: day8,
          follow_up_day_14: day14,
        },
      });

      // Update prospect status
      if (selectedProspectId) {
        await supabase.from("prospects").update({
          status: "contacted",
        }).eq("id", selectedProspectId);
      }

      toast.success("تم إرسال الرسالة بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء الإرسال");
    }
  };

  const handleFollowUp = async (messageId: string, day: number) => {
    const updates: Record<string, boolean> = {};
    if (day === 4) updates.follow_up_4_done = true;
    if (day === 8) updates.follow_up_8_done = true;
    if (day === 14) updates.follow_up_14_done = true;

    try {
      await updateMessage.mutateAsync({ id: messageId, updates });
      toast.success(`تم تسجيل متابعة اليوم ${day}`);
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleConvertToLead = async () => {
    if (!convertingProspect || !research) return;

    try {
      // Create lead in CRM
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          org_id: orgId!,
          name: leadData.name || decisionMakers[0]?.name || convertingProspect.name,
          email: leadData.email || decisionMakers[0]?.email || "",
          phone: leadData.phone || decisionMakers[0]?.phone || "",
          company: leadData.company || convertingProspect.name,
          project: leadData.project || convertingProspect.sector,
          source: "lead_engine",
          notes: research.opportunity_insight || "",
          status: "new",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Update prospect status
      await supabase.from("prospects").update({
        status: "converted",
        converted_lead_id: lead.id,
      }).eq("id", convertingProspect.id);

      // Create notification
      await supabase.from("notifications").insert({
        org_id: orgId!,
        user_email: user?.email,
        type: "lead",
        title: "Lead جديد من Lead Engine",
        message: `تم تحويل ${convertingProspect.name} إلى Lead في CRM`,
        link: "/crm",
        is_read: false,
      });

      toast.success("تم التحويل إلى Lead بنجاح");
      setConvertModalOpen(false);
      setConvertingProspect(null);
      setLeadData({ name: "", email: "", phone: "", company: "", project: "" });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل التحويل");
    }
  };

  const openConvertModal = (prospect: Prospect) => {
    setConvertingProspect(prospect);
    setLeadData({
      name: decisionMakers[0]?.name || "",
      email: decisionMakers[0]?.email || "",
      phone: decisionMakers[0]?.phone || "",
      company: prospect.name,
      project: prospect.sector,
    });
    setConvertModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Eligible Prospects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            شركات جاهزة للتواصل ({eligibleProspects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {eligibleProspects.map((prospect) => (
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
                <div className="flex justify-between items-center mt-1">
                  <Badge variant="outline" className="text-xs">
                    {prospect.sector}
                  </Badge>
                  <Badge className={`text-xs ${prospect.status === "contacted" ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"}`}>
                    {prospect.status === "contacted" ? "تم التواصل" : "جاهز"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Builder */}
      {selectedProspect && research && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{selectedProspect.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">بناء رسالة تواصل</p>
              </div>
              {selectedProspect.status === "contacted" && (
                <Button size="sm" onClick={() => openConvertModal(selectedProspect)}>
                  <Users className="h-3 w-3 mr-1" />
                  تحويل للـ CRM
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 4 Steps */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                  ملاحظة حقيقية
                </Label>
                <Textarea
                  value={messageDraft.observation}
                  onChange={(e) => setMessageDraft({ ...messageDraft, observation: e.target.value })}
                  placeholder="مثال: لاحظنا إنكم نشطين جداً على LinkedIn..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                  فرصة / مشكلة
                </Label>
                <Textarea
                  value={messageDraft.opportunity}
                  onChange={(e) => setMessageDraft({ ...messageDraft, opportunity: e.target.value })}
                  placeholder="مثال: ممكن تحسين الـ engagement rate بنسبة 50%..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">3</span>
                  فكرة قصيرة
                </Label>
                <Textarea
                  value={messageDraft.idea}
                  onChange={(e) => setMessageDraft({ ...messageDraft, idea: e.target.value })}
                  placeholder="مثال: نقترح campaign تفاعلي يركز على..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">4</span>
                  دعوة بسيطة
                </Label>
                <Textarea
                  value={messageDraft.call_to_action}
                  onChange={(e) => setMessageDraft({ ...messageDraft, call_to_action: e.target.value })}
                  placeholder="مثال: تحب نعمل call قصير الأسبوع الجاي؟"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateMessage}
                disabled={generating}
                variant="outline"
                size="sm"
              >
                {generating ? (
                  <>
                    <Brain className="h-3 w-3 mr-2 animate-pulse" />
                    جاري الكتابة...
                  </>
                ) : (
                  <>
                    <Brain className="h-3 w-3 mr-2" />
                    اكتب بالـ AI
                  </>
                )}
              </Button>
              <Button onClick={() => setPreviewOpen(true)} variant="outline" size="sm">
                👁️ معاينة
              </Button>
              <Button onClick={handleSaveMessage} size="sm">
                حفظ مسودة
              </Button>
            </div>

            {/* Sent Messages & Follow-ups */}
            {messages.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs font-medium mb-3">الرسائل المرسلة</p>
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={msg.status === "sent" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}>
                          {msg.status === "sent" ? "مرسلة" : "مسودة"}
                        </Badge>
                        {msg.status === "draft" && (
                          <Button size="sm" onClick={() => handleSendMessage(msg.id)}>
                            <Send className="h-3 w-3 mr-1" />
                            إرسال
                          </Button>
                        )}
                      </div>

                      {msg.status === "sent" && msg.sent_at && (
                        <div className="flex items-center gap-4 text-xs mt-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>اليوم 1</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {msg.follow_up_4_done ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-yellow-500" />
                            )}
                            <span>اليوم 4</span>
                            {!msg.follow_up_4_done && new Date(msg.follow_up_day_4!) <= new Date() && (
                              <Button size="xs" variant="outline" onClick={() => handleFollowUp(msg.id, 4)}>
                                تم المتابعة
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {msg.follow_up_8_done ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-yellow-500" />
                            )}
                            <span>اليوم 8</span>
                            {!msg.follow_up_8_done && new Date(msg.follow_up_day_8!) <= new Date() && (
                              <Button size="xs" variant="outline" onClick={() => handleFollowUp(msg.id, 8)}>
                                تم المتابعة
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {msg.follow_up_14_done ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-yellow-500" />
                            )}
                            <span>اليوم 14</span>
                            {!msg.follow_up_14_done && new Date(msg.follow_up_day_14!) <= new Date() && (
                              <Button size="xs" variant="outline" onClick={() => handleFollowUp(msg.id, 14)}>
                                تم المتابعة
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>معاينة الرسالة</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {messageDraft.observation}\n\n
            {messageDraft.opportunity}\n\n
            {messageDraft.idea}\n\n
            {messageDraft.call_to_action}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Lead Dialog */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحويل إلى Lead في CRM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">الاسم</Label>
                <Input
                  value={leadData.name}
                  onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">الشركة</Label>
                <Input
                  value={leadData.company}
                  onChange={(e) => setLeadData({ ...leadData, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">الإيميل</Label>
                <Input
                  value={leadData.email}
                  onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">الموبايل</Label>
                <Input
                  value={leadData.phone}
                  onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">المشروع</Label>
              <Input
                value={leadData.project}
                onChange={(e) => setLeadData({ ...leadData, project: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleConvertToLead}>تأكيد التحويل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
