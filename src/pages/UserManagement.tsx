import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Shield, Trash2, Loader2, Mail, Users, Search, Settings2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS, ALL_PAGES, DEFAULT_ACCESS, DEFAULT_CRM_PERMS, type AppRole, type UserPermissions } from "@/lib/roles";

const MAX_MEMBERS = 50;

const AVAILABLE_ROLES: { value: string; label: string; desc: string }[] = [
  { value: "owner", label: "صاحب الشركة (Owner)", desc: "صلاحيات كاملة" },
  { value: "sales_manager", label: "مدير المبيعات (Sales Manager)", desc: "إدارة فريق المبيعات والليدز" },
  { value: "marketing_manager", label: "مدير التسويق (Marketing Manager)", desc: "إدارة الحملات والتسويق" },
  { value: "team_leader", label: "تيم ليدر (Team Leader)", desc: "مشاهدة أداء الفريق والليدز" },
  { value: "sales_rep", label: "سيلز (Sales Rep)", desc: "التعامل مع الليدز المعينة فقط" },
  { value: "viewer", label: "مشاهد (Viewer)", desc: "عرض الداشبورد فقط — بدون أي تعديل" },
];

const UserManagement = () => {
  const { user, userRole, orgId, loading } = useAuth();
  const queryClient = useQueryClient();
  const { members, loading: membersLoading } = useOrgMembers();

  const { data: invitations = [], isLoading: invLoading } = useQuery({
    queryKey: ["invitations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("invitations").select("*").eq("org_id", orgId).eq("status", "pending");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Fetch all user_permissions for org
  const { data: allPerms = [] } = useQuery({
    queryKey: ["user_permissions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("user_permissions").select("*").eq("org_id", orgId);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Permissions modal state
  const [permsOpen, setPermsOpen] = useState(false);
  const [permsMember, setPermsMember] = useState<any>(null);
  const [permsPages, setPermsPages] = useState<string[]>([]);
  const [permsCrm, setPermsCrm] = useState({ crm_see_all: false, crm_can_assign: false, crm_can_delete: false, crm_can_add: false, crm_see_all_comments: false });
  const [permsSaving, setPermsSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (userRole !== "owner" && userRole !== "super_admin")) {
    return <Navigate to="/" replace />;
  }

  const filteredMembers = members.filter(m => {
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      if (!(m.display_name || "").toLowerCase().includes(q) && !(m.email || "").toLowerCase().includes(q)) return false;
    }
    if (filterRole !== "all" && m.role !== filterRole) return false;
    return true;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data: memberRecord } = await supabase.from("organization_members").select("id").eq("org_id", orgId!).eq("user_id", userId).single();
      if (memberRecord) {
        const { error } = await supabase.from("organization_members").update({ role: newRole }).eq("id", memberRecord.id);
        if (error) throw error;
      }
      toast.success("تم تحديث الدور");
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: memberRecord } = await supabase.from("organization_members").select("id").eq("org_id", orgId!).eq("user_id", deleteTarget.id).single();
      if (memberRecord) {
        const { error } = await supabase.from("organization_members").delete().eq("id", memberRecord.id);
        if (error) throw error;
      }
      // Also remove custom permissions
      await supabase.from("user_permissions").delete().eq("user_id", deleteTarget.id).eq("org_id", orgId!);
      toast.success("تم إزالة العضو");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
      queryClient.invalidateQueries({ queryKey: ["user_permissions"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    } finally {
      setDeleting(false);
    }
  };

  const openPermsModal = (member: any) => {
    const existing = allPerms.find((p: any) => p.user_id === member.user_id);
    const role = member.role as AppRole;
    if (existing && existing.is_custom) {
      setPermsPages(existing.page_access || []);
      setPermsCrm({
        crm_see_all: existing.crm_see_all,
        crm_can_assign: existing.crm_can_assign,
        crm_can_delete: existing.crm_can_delete,
        crm_can_add: existing.crm_can_add,
        crm_see_all_comments: existing.crm_see_all_comments,
      });
    } else {
      setPermsPages(DEFAULT_ACCESS[role] || []);
      const defaults = DEFAULT_CRM_PERMS[role] || DEFAULT_CRM_PERMS.viewer;
      setPermsCrm({
        crm_see_all: defaults.crm_see_all,
        crm_can_assign: defaults.crm_can_assign,
        crm_can_delete: defaults.crm_can_delete,
        crm_can_add: defaults.crm_can_add,
        crm_see_all_comments: defaults.crm_see_all_comments,
      });
    }
    setPermsMember(member);
    setPermsOpen(true);
  };

  const resetPermsToDefault = () => {
    if (!permsMember) return;
    const role = permsMember.role as AppRole;
    setPermsPages(DEFAULT_ACCESS[role] || []);
    const defaults = DEFAULT_CRM_PERMS[role] || DEFAULT_CRM_PERMS.viewer;
    setPermsCrm({
      crm_see_all: defaults.crm_see_all,
      crm_can_assign: defaults.crm_can_assign,
      crm_can_delete: defaults.crm_can_delete,
      crm_can_add: defaults.crm_can_add,
      crm_see_all_comments: defaults.crm_see_all_comments,
    });
  };

  const savePerms = async () => {
    if (!permsMember || !orgId) return;
    setPermsSaving(true);
    const role = permsMember.role as AppRole;
    const defaultPages = DEFAULT_ACCESS[role] || [];
    const defaultCrm = DEFAULT_CRM_PERMS[role] || DEFAULT_CRM_PERMS.viewer;
    const isCustom = JSON.stringify([...permsPages].sort()) !== JSON.stringify([...defaultPages].sort()) ||
      permsCrm.crm_see_all !== defaultCrm.crm_see_all ||
      permsCrm.crm_can_assign !== defaultCrm.crm_can_assign ||
      permsCrm.crm_can_delete !== defaultCrm.crm_can_delete ||
      permsCrm.crm_can_add !== defaultCrm.crm_can_add ||
      permsCrm.crm_see_all_comments !== defaultCrm.crm_see_all_comments;

    try {
      const { error } = await supabase.from("user_permissions").upsert({
        user_id: permsMember.user_id,
        org_id: orgId,
        page_access: permsPages,
        ...permsCrm,
        is_custom: isCustom,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,org_id" });
      if (error) throw error;
      toast.success("تم حفظ الصلاحيات");
      setPermsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user_permissions"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setPermsSaving(false);
    }
  };

  const togglePage = (path: string) => {
    setPermsPages(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };

  const bulkRoleChange = async (newRole: string) => {
    for (const uid of selectedIds) {
      await handleRoleChange(uid, newRole);
    }
    setSelectedIds(new Set());
  };

  const bulkRemove = async () => {
    for (const uid of selectedIds) {
      const m = members.find(m => m.user_id === uid);
      if (m) {
        const { data: memberRecord } = await supabase.from("organization_members").select("id").eq("org_id", orgId!).eq("user_id", uid).single();
        if (memberRecord) await supabase.from("organization_members").delete().eq("id", memberRecord.id);
      }
    }
    toast.success(`تم إزالة ${selectedIds.size} عضو`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["org_members"] });
  };

  const memberCount = members.length;
  const progressPct = (memberCount / MAX_MEMBERS) * 100;
  const progressColor = memberCount > 45 ? "text-destructive" : memberCount > 30 ? "text-orange-400" : "text-green-400";
  const isLoading = membersLoading || invLoading;

  return (
    <DashboardLayout title="إدارة الفريق" subtitle={`${memberCount} / ${MAX_MEMBERS} عضو`}>
      <div className="page-fade-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="section-header flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              إدارة الفريق
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progressPct} className="w-48 h-2" />
              <span className={`text-xs font-medium ${progressColor}`}>{memberCount}/{MAX_MEMBERS} عضو</span>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الإيميل..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأدوار</SelectItem>
              {AVAILABLE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium text-primary">{selectedIds.size} محدد</span>
            <Select onValueChange={bulkRoleChange}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="تغيير الدور..." /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" onClick={bulkRemove} className="gap-1.5 ml-auto">
              <Trash2 className="h-3.5 w-3.5" />إزالة
            </Button>
          </div>
        )}

        {/* Members List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden card-glow">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="w-10 px-3 py-3"><Checkbox checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0} onCheckedChange={(c) => { if (c) setSelectedIds(new Set(filteredMembers.filter(m => m.user_id !== user?.id).map(m => m.user_id))); else setSelectedIds(new Set()); }} /></th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">العضو</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">الدور</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">الصلاحيات</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">الحالة</th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.sales_rep;
                    const isSelf = member.user_id === user?.id;
                    const memberPerm = allPerms.find((p: any) => p.user_id === member.user_id);
                    const isCustom = memberPerm?.is_custom;
                    return (
                      <tr key={member.user_id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-3 py-3">
                          {!isSelf && <Checkbox checked={selectedIds.has(member.user_id)} onCheckedChange={() => { const next = new Set(selectedIds); if (next.has(member.user_id)) next.delete(member.user_id); else next.add(member.user_id); setSelectedIds(next); }} />}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {(member.display_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{member.display_name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {isSelf ? (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.color}`}>{roleInfo.label}</span>
                          ) : (
                            <Select value={member.role} onValueChange={(val) => handleRoleChange(member.user_id, val)}>
                              <SelectTrigger className="w-[200px] h-8 text-xs bg-secondary/30 border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_ROLES.map(r => (
                                  <SelectItem key={r.value} value={r.value}>
                                    <div>
                                      <span className="font-medium">{r.label}</span>
                                      <span className="text-muted-foreground ml-2 text-[10px]">{r.desc}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {isCustom && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">مخصص</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-400 status-dot-pulse" />نشط
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isSelf && (
                              <>
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openPermsModal(member)}>
                                  <Settings2 className="h-3.5 w-3.5" />تعديل الصلاحيات
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({ id: member.user_id, name: member.display_name })}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Pending invitations */}
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-3 py-3" />
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary/50 border border-border flex items-center justify-center text-xs text-muted-foreground shrink-0">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">دعوة معلقة</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ROLE_LABELS[inv.role || "sales_rep"]?.color || ROLE_LABELS.sales_rep.color}`}>
                          {ROLE_LABELS[inv.role || "sales_rep"]?.label || inv.role}
                        </span>
                      </td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
                          <div className="w-2 h-2 rounded-full bg-warning status-dot-pulse" />معلقة
                        </span>
                      </td>
                      <td className="px-5 py-3" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Permissions Modal */}
        <Dialog open={permsOpen} onOpenChange={setPermsOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground" dir="rtl">صلاحيات {permsMember?.display_name}</DialogTitle>
              <p className="text-xs text-muted-foreground" dir="rtl">
                الدور الأساسي: {ROLE_LABELS[permsMember?.role]?.label || permsMember?.role} — يمكنك تخصيص الصلاحيات
              </p>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3" dir="rtl">الصفحات المتاحة</h4>
                <div className="space-y-2">
                  {ALL_PAGES.map(page => {
                    const isDefault = (DEFAULT_ACCESS[permsMember?.role as AppRole] || []).includes(page.path);
                    return (
                      <div key={page.path} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <Switch checked={permsPages.includes(page.path)} onCheckedChange={() => togglePage(page.path)} />
                          <span className="text-sm text-foreground">{page.label}</span>
                        </div>
                        {isDefault && <span className="text-[10px] text-muted-foreground">افتراضي</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {permsPages.includes("/crm") && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3" dir="rtl">صلاحيات CRM</h4>
                  <div className="space-y-2">
                    {[
                      { key: "crm_see_all", label: "مشاهدة كل الليدز" },
                      { key: "crm_can_assign", label: "تعيين/نقل الليدز" },
                      { key: "crm_can_delete", label: "حذف الليدز" },
                      { key: "crm_can_add", label: "إضافة ليدز جديدة" },
                      { key: "crm_see_all_comments", label: "مشاهدة كل التعليقات" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30">
                        <Switch
                          checked={(permsCrm as any)[item.key]}
                          onCheckedChange={v => setPermsCrm(prev => ({ ...prev, [item.key]: v }))}
                        />
                        <span className="text-sm text-foreground" dir="rtl">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={savePerms} className="flex-1 bg-primary text-primary-foreground" disabled={permsSaving}>
                  {permsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  حفظ
                </Button>
                <Button variant="outline" onClick={resetPermsToDefault}>إعادة للافتراضي</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">إزالة عضو</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من إزالة <strong>{deleteTarget?.name}</strong>؟ سيفقد الوصول لكل البيانات.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                إزالة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
