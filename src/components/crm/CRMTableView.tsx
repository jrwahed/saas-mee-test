import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, UserPlus, MoreHorizontal, Eye, Phone, MessageCircle, MessageSquare, Plus, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { stages, calcLeadScore, calcLeadScoreBreakdown, getScoreColor, timeAgo } from "./crmUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calcAILeadScore } from "@/lib/leadScoring";
import { getWhatsAppUrl } from "./whatsappUtils";
import { notifyManagers, notifyUser } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadCommentCounts } from "@/hooks/useLeadComments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";
import type { OrgMember } from "@/hooks/useOrgMembers";

interface Props {
  leads: Tables<"leads">[];
  onLeadClick: (lead: Tables<"leads">) => void;
  onLeadCommentClick?: (lead: Tables<"leads">) => void;
  orgMembers: OrgMember[];
  userRole?: string | null;
  leadScoringOn?: boolean;
  canAssign?: boolean;
  canDelete?: boolean;
  isViewer?: boolean;
}

export function CRMTableView({ leads, onLeadClick, onLeadCommentClick, orgMembers, userRole, leadScoringOn, canAssign = false, canDelete = false, isViewer = false }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssign, setBulkAssign] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickCommentId, setQuickCommentId] = useState<string | null>(null);
  const [quickCommentText, setQuickCommentText] = useState("");
  const [quickSending, setQuickSending] = useState(false);
  const queryClient = useQueryClient();
  const { orgId, user, userName } = useAuth();

  const leadIds = useMemo(() => leads.map(l => l.id), [leads]);
  const commentCounts = useLeadCommentCounts(leadIds);

  const allSelected = selected.size === leads.length && leads.length > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const updateField = async (id: string, field: string, value: string) => {
    if (isViewer) return;
    const lead = leads.find(l => l.id === id);
    const oldValue = lead ? (lead as any)[field] : "";
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", id).eq("org_id", orgId!);
    if (error) { toast.error("Update failed"); return; }

    if (orgId && lead) {
      if (field === "status" && oldValue !== value) {
        notifyManagers(orgId, "تغيير حالة ليد", `${lead.name || "ليد"}: ${oldValue} → ${value}`, "status", "/crm");
        if (value === "Sold / Closed Won") {
          notifyManagers(orgId, "صفقة مغلقة!", `${lead.name || "ليد"} — ${lead.project || ""}`, "deal", "/crm");
        }
      }
      if (field === "assigned_to" && oldValue !== value) {
        notifyUser(orgId, value, "ليد جديد معين لك", `ليد جديد: ${lead.name || "ليد"} — ${lead.phone || ""}`, "assignment", "/crm");
        if (oldValue) {
          notifyUser(orgId, oldValue, "تم نقل ليد", `تم نقل ${lead.name || "ليد"} منك`, "reassignment", "/crm");
        }
      }
    }
    invalidate();
  };

  const deleteLead = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("leads").delete().eq("id", deleteId).eq("org_id", orgId!);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Lead deleted");
    setDeleteId(null);
    invalidate();
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").delete().in("id", ids).eq("org_id", orgId!);
    if (error) { toast.error("Delete failed"); return; }
    toast.success(`${ids.length} leads deleted`);
    setSelected(new Set());
    invalidate();
  };

  const bulkAssignTo = async () => {
    if (selected.size === 0 || !bulkAssign) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").update({ assigned_to: bulkAssign }).in("id", ids).eq("org_id", orgId!);
    if (error) { toast.error("Assign failed"); return; }
    toast.success(`${ids.length} leads assigned`);
    setSelected(new Set());
    setBulkAssign("");
    invalidate();
  };

  const submitQuickComment = async () => {
    if (!quickCommentId || !quickCommentText.trim() || !orgId || !user) return;
    setQuickSending(true);
    const { error } = await supabase.from("lead_comments").insert({
      lead_id: quickCommentId,
      org_id: orgId,
      user_email: user.email || "",
      user_name: userName || user.email?.split("@")[0] || "User",
      comment: quickCommentText.trim(),
    });
    setQuickSending(false);
    if (error) { toast.error("Failed to add comment"); return; }
    const lead = leads.find(l => l.id === quickCommentId);
    if (orgId) {
      notifyManagers(orgId, "كومنت جديد", `كومنت على ${lead?.name || "ليد"}`, "comment", "/crm");
    }
    toast.success("Comment added");
    setQuickCommentId(null);
    setQuickCommentText("");
  };

  const getStage = (status: string | null) => stages.find(s => s.id === (status || "Fresh"));

  return (
    <div>
      {selected.size > 0 && canAssign && !isViewer && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <Select value={bulkAssign} onValueChange={setBulkAssign}>
            <SelectTrigger className="w-[200px] h-8">
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {orgMembers.map(m => (
                <SelectItem key={m.user_id} value={m.email}>{m.display_name} ({m.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bulkAssign && <Button size="sm" onClick={bulkAssignTo}>Assign</Button>}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={bulkDelete} className="ml-auto gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />Delete
            </Button>
          )}
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              {canAssign && !isViewer && <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>}
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Title</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Type</TableHead>

              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">وقت التواصل</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
              {canAssign && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</TableHead>}
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{leadScoringOn ? "AI Score" : "Score"}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comments</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</TableHead>
              {!isViewer && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(lead => {
              const score = calcLeadScore(lead);
              const sc = getScoreColor(score);
              const aiScore = leadScoringOn ? calcAILeadScore(lead, (lead as any).job_title) : null;
              const stage = getStage(lead.status);
              const count = commentCounts[lead.id] || 0;
              return (
                <TableRow key={lead.id} className="hover:bg-secondary/20 transition-colors group">
                  {canAssign && !isViewer && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} />
                    </TableCell>
                  )}
                  <TableCell className="cursor-pointer" onClick={() => onLeadClick(lead)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(lead.name || "?").charAt(0)}
                      </div>
                      <span className="font-medium text-foreground text-sm">{lead.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {lead.phone ? (
                        <>
                          <a href={`tel:${lead.phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            {lead.phone}
                          </a>
                          {!isViewer && (
                            <a href={getWhatsAppUrl(lead.phone)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:scale-110 transition-transform" title="WhatsApp">
                              <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} />
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isViewer ? (
                      <span className="text-sm text-muted-foreground">{lead.project || "—"}</span>
                    ) : (
                      <input
                        className="text-sm text-muted-foreground bg-transparent border-none outline-none w-[120px] hover:bg-secondary/50 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary/30"
                        defaultValue={lead.project || ""}
                        placeholder="—"
                        onBlur={e => {
                          if (e.target.value !== (lead.project || "")) updateField(lead.id, "project", e.target.value);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isViewer ? (
                      <span className="text-sm text-muted-foreground">{(lead as any).job_title || "—"}</span>
                    ) : (
                      <input
                        className="text-sm text-muted-foreground bg-transparent border-none outline-none w-[120px] hover:bg-secondary/50 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary/30"
                        defaultValue={(lead as any).job_title || ""}
                        placeholder="—"
                        onBlur={e => {
                          if (e.target.value !== ((lead as any).job_title || "")) updateField(lead.id, "job_title", e.target.value);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isViewer ? (
                      <span className="text-sm text-muted-foreground">{(lead as any).unit_type || "—"}</span>
                    ) : (
                      <input
                        className="text-sm text-muted-foreground bg-transparent border-none outline-none w-[120px] hover:bg-secondary/50 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary/30"
                        defaultValue={(lead as any).unit_type || ""}
                        placeholder="—"
                        onBlur={e => {
                          if (e.target.value !== ((lead as any).unit_type || "")) updateField(lead.id, "unit_type", e.target.value);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isViewer ? (
                      <span className="text-sm text-muted-foreground">{(lead as any).contact_time || "—"}</span>
                    ) : (
                      <input
                        className="text-sm text-muted-foreground bg-transparent border-none outline-none w-[120px] hover:bg-secondary/50 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary/30"
                        defaultValue={(lead as any).contact_time || ""}
                        placeholder="—"
                        onBlur={e => {
                          if (e.target.value !== ((lead as any).contact_time || "")) updateField(lead.id, "contact_time", e.target.value);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isViewer ? (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", stage?.dotColor)} />
                        <span className="text-xs">{stage?.label || lead.status}</span>
                      </div>
                    ) : (
                      <Select value={lead.status || "Fresh"} onValueChange={v => updateField(lead.id, "status", v)}>
                        <SelectTrigger className="h-7 w-[200px] text-xs border-none bg-transparent hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", stage?.dotColor)} />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
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
                    )}
                  </TableCell>
                  {canAssign && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      {isViewer ? (
                        <span className="text-xs text-muted-foreground">{lead.assigned_to || "—"}</span>
                      ) : (
                        <Select value={lead.assigned_to || ""} onValueChange={v => updateField(lead.id, "assigned_to", v)}>
                          <SelectTrigger className="h-7 w-[160px] text-xs border-none bg-transparent hover:bg-secondary/50 transition-colors">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {orgMembers.map(m => (
                              <SelectItem key={m.user_id} value={m.email}>{m.display_name} ({m.role})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {leadScoringOn && aiScore ? (
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", aiScore.gradeColor)}>
                        {aiScore.grade} ({aiScore.total})
                      </span>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full cursor-help", sc.bg, sc.text)}>{score}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {(() => {
                              const bd = calcLeadScoreBreakdown(lead);
                              return `الوظيفة: ${bd.job}/35 | الحالة: ${bd.status}/25 | المشروع: ${bd.project}/15 | نوع الوحدة: ${bd.unitType}/10 | البيانات: ${bd.data}/10`;
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onLeadCommentClick?.(lead)}
                        className="relative flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                        title="View comments"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {count > 0 && (
                          <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                            {count}
                          </span>
                        )}
                      </button>
                      {!isViewer && (
                        <button
                          onClick={() => { setQuickCommentId(quickCommentId === lead.id ? null : lead.id); setQuickCommentText(""); }}
                          className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                          title="Quick comment"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {quickCommentId === lead.id && !isViewer && (
                      <div className="mt-2 flex gap-1.5 items-end" onClick={e => e.stopPropagation()}>
                        <Textarea
                          value={quickCommentText}
                          onChange={e => setQuickCommentText(e.target.value)}
                          placeholder="اكتب تعليق..."
                          rows={1}
                          className="resize-none text-xs flex-1 min-w-[140px]"
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuickComment(); } }}
                          autoFocus
                        />
                        <Button size="icon" className="h-7 w-7 shrink-0 bg-primary text-primary-foreground" onClick={submitQuickComment} disabled={quickSending || !quickCommentText.trim()}>
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setQuickCommentId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                  </TableCell>
                  {!isViewer && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onLeadClick(lead)} className="gap-2">
                            <Eye className="h-3.5 w-3.5" />View Details
                          </DropdownMenuItem>
                          {lead.phone && (
                            <>
                              <DropdownMenuItem asChild className="gap-2">
                                <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5" />Call</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2">
                                <a href={getWhatsAppUrl(lead.phone)} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteId(lead.id)} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={canAssign ? 13 : 11} className="text-center py-16 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
