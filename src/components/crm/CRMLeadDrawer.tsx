import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Phone, MessageCircle, Edit2, Trash2, CheckCircle2, ArrowRight, CircleDot, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { stages, calcLeadScore, getScoreColor } from "./crmUtils";
import { calcAILeadScore } from "@/lib/leadScoring";
import { getWhatsAppUrl } from "./whatsappUtils";
import { CRMCommentsTab } from "./CRMCommentsTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import type { OrgMember } from "@/hooks/useOrgMembers";

interface Props {
  lead: Tables<"leads"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgMembers: OrgMember[];
  defaultTab?: string;
  userRole?: string | null;
  leadScoringOn?: boolean;
  isViewer?: boolean;
}

export function CRMLeadDrawer({ lead, open, onOpenChange, orgMembers, defaultTab = "details", userRole, leadScoringOn, isViewer = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", project: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const queryClient = useQueryClient();

  const isSalesRep = userRole === "sales_rep";
  const canReassign = !isSalesRep;
  const canDelete = userRole === "owner";

  const handleOpenChange = (v: boolean) => {
    if (!v) { setEditing(false); setActiveTab("details"); }
    onOpenChange(v);
  };

  if (open && defaultTab !== activeTab && defaultTab === "comments") {
    setActiveTab("comments");
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const startEdit = () => {
    if (!lead) return;
    setEditForm({ name: lead.name || "", phone: lead.phone || "", project: lead.project || "", notes: lead.notes || "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!lead) return;
    setSaving(true);
    const { error } = await supabase.from("leads").update(editForm).eq("id", lead.id).eq("org_id", lead.org_id);
    setSaving(false);
    if (error) { toast.error("Save failed"); return; }
    toast.success("Lead updated");
    setEditing(false);
    invalidate();
    onOpenChange(false);
  };

  const updateField = async (field: string, value: string) => {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", lead.id).eq("org_id", lead.org_id);
    if (error) { toast.error("Update failed"); return; }
    invalidate();
  };

  const saveNotes = useCallback(async (value: string) => {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ notes: value }).eq("id", lead.id).eq("org_id", lead.org_id);
    if (error) { toast.error("Save failed"); return; }
    invalidate();
  }, [lead]);

  const confirmDelete = async () => {
    if (!lead) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id).eq("org_id", lead.org_id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Lead deleted");
    setDeleteOpen(false);
    onOpenChange(false);
    invalidate();
  };

  const score = lead ? calcLeadScore(lead) : 0;
  const sc = getScoreColor(score);
  const aiScore = lead && leadScoringOn ? calcAILeadScore(lead, (lead as any).job_title) : null;
  const stage = lead ? stages.find(s => s.id === (lead.status || "Fresh")) : null;

  const timeline = lead ? [
    { label: "Lead Created", date: lead.created_at, icon: CircleDot, active: true },
    { label: "Qualified", date: lead.status !== "Qualified" ? lead.updated_at : null, icon: ArrowRight, active: lead.status !== "Qualified" },
    { label: "Meeting / Follow-up", date: ["Meeting / Visit Scheduled", "Follow-up / Re-call", "Reserved / Under Contract", "Sold / Closed Won"].includes(lead.status || "") ? lead.updated_at : null, icon: Phone, active: ["Meeting / Visit Scheduled", "Follow-up / Re-call", "Reserved / Under Contract", "Sold / Closed Won"].includes(lead.status || "") },
    { label: "Sold / Closed Won", date: lead.status === "Sold / Closed Won" ? lead.updated_at : null, icon: CheckCircle2, active: lead.status === "Sold / Closed Won" },
  ] : [];

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[440px] sm:w-[480px] overflow-y-auto p-0">
          {lead && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border">
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-background border-2 border-border flex items-center justify-center text-lg font-bold text-primary">
                      {(lead.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-foreground">{lead.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {leadScoringOn && aiScore ? (
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", aiScore.gradeColor)}>
                            {aiScore.grade} ({aiScore.total}/100)
                          </span>
                        ) : (
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
                            {score}/100
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", stage?.dotColor)} />
                          <span className="text-xs text-muted-foreground">{stage?.label}</span>
                        </div>
                      </div>
                      {leadScoringOn && aiScore && (
                        <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                          <span>Job: {aiScore.jobTitle}/50</span>
                          <span>Status: {aiScore.status}/30</span>
                          <span>Engage: {aiScore.engagement}/20</span>
                        </div>
                      )}
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex gap-2">
                  {lead.phone && (
                    <>
                      <Button size="sm" variant="outline" asChild className="gap-1.5 flex-1">
                        <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5" />Call</a>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="gap-1.5 flex-1" style={{ borderColor: "#25D366", color: "#25D366" }}>
                        <a href={getWhatsAppUrl(lead.phone)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                        </a>
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5 flex-1">
                    <Edit2 className="h-3.5 w-3.5" />Edit
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                    <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-5 mt-0">
                    {!editing ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                            <Select value={lead.status || "Fresh"} onValueChange={v => updateField("status", v)}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {stages.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", s.dotColor)} />
                                      {s.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned To</Label>
                            {canReassign ? (
                              <Select value={lead.assigned_to || ""} onValueChange={v => updateField("assigned_to", v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                  {orgMembers.map(m => (
                                    <SelectItem key={m.user_id} value={m.email}>{m.display_name} ({m.role})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-foreground py-2">{lead.assigned_to || "—"}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-0">
                          {[
                            { label: "Phone", value: lead.phone },
                            { label: "Project", value: lead.project },
                            { label: "Job Title", value: (lead as any).job_title },
                            { label: "Unit Type", value: (lead as any).unit_type },

                            { label: "وقت التواصل", value: (lead as any).contact_time },
                            { label: "Source", value: lead.source },
                            { label: "Created", value: lead.created_at ? new Date(lead.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }) : "" },
                          ].map(f => (
                            <div key={f.label} className="flex justify-between items-center py-3 border-b border-border/30">
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</span>
                              <span className="text-sm text-foreground">{f.value || "—"}</span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
                          <Textarea
                            defaultValue={lead.notes || ""}
                            onBlur={e => {
                              if (e.target.value !== (lead.notes || "")) saveNotes(e.target.value);
                            }}
                            rows={3}
                            placeholder="Add notes..."
                            className="resize-none"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-3 block uppercase tracking-wider">Activity</Label>
                          <div className="space-y-0">
                            {timeline.map((t, i) => (
                              <div key={t.label} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", t.active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}>
                                    <t.icon className="h-3.5 w-3.5" />
                                  </div>
                                  {i < timeline.length - 1 && (
                                    <div className={cn("w-px h-6", t.active ? "bg-primary/30" : "bg-border")} />
                                  )}
                                </div>
                                <div className="pt-1">
                                  <p className={cn("text-sm", t.active ? "text-foreground font-medium" : "text-muted-foreground")}>{t.label}</p>
                                  {t.date && t.active && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(t.date).toLocaleDateString("en")}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { key: "name", label: "Name" },
                          { key: "phone", label: "Phone" },
                          { key: "project", label: "Project" },
                        ].map(f => (
                          <div key={f.key}>
                            <Label className="text-xs">{f.label}</Label>
                            <Input value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                          </div>
                        ))}
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={4} />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} disabled={saving} className="flex-1 gap-1.5">
                            <Save className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save"}
                          </Button>
                          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0" style={{ height: "calc(100vh - 280px)" }}>
                    <CRMCommentsTab leadId={lead.id} leadName={lead.name || undefined} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {lead?.name}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
