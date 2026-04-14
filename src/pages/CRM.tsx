import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageAIBanner } from "@/components/PageAIBanner";
import { useLeadsData } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import type { DropResult } from "@hello-pangea/dnd";
import type { Tables } from "@/integrations/supabase/types";

import { CRMTopBar } from "@/components/crm/CRMTopBar";
import { CRMStatsBar } from "@/components/crm/CRMStatsBar";
import { CRMKanbanBoard } from "@/components/crm/CRMKanbanBoard";
import { CRMTableView } from "@/components/crm/CRMTableView";
import { CRMLeadDrawer } from "@/components/crm/CRMLeadDrawer";
import { CRMAddLeadModal } from "@/components/crm/CRMAddLeadModal";
import { calcLeadScore, stages, type SortOption, type ViewMode } from "@/components/crm/crmUtils";
import { calcAILeadScore } from "@/lib/leadScoring";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadCommentCounts } from "@/hooks/useLeadComments";

const stageOrder: Record<string, number> = Object.fromEntries(stages.map((s, i) => [s.id, i]));

const CRM = () => {
  const { data: leads = [], isLoading, error, refetch } = useLeadsData({ forCRM: true });
  const { orgId, userRole, userName, user, permissions, isViewer } = useAuth();
  const { members: orgMembers } = useOrgMembers();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Tables<"leads"> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("details");
  const [addOpen, setAddOpen] = useState(false);
  const [leadScoringOn, setLeadScoringOn] = useState(false);

  useRealtimeSubscription("leads", ["leads"], "crm-leads-rt");

  // Use permissions from context
  const canSeeAll = permissions.crm_see_all;
  const canAssign = permissions.crm_can_assign;
  const canDelete = permissions.crm_can_delete;
  const canAdd = permissions.crm_can_add;

  const assignedOptions = useMemo(() =>
    orgMembers.map(m => m.email),
    [orgMembers]
  );

  const projectOptions = useMemo(() => [...new Set(leads.map(l => l.project).filter(Boolean) as string[])], [leads]);

  // Role-based lead filtering using permissions
  const roleFilteredLeads = useMemo(() => {
    if (!canSeeAll) {
      const userEmail = user?.email?.toLowerCase() || "";
      const userDisplayName = (userName || "").toLowerCase();
      return leads.filter(l => {
        const assigned = (l.assigned_to || "").toLowerCase();
        return assigned === userEmail || assigned === userDisplayName;
      });
    }
    return leads;
  }, [leads, canSeeAll, userName, user]);

  const leadIds = useMemo(() => roleFilteredLeads.map(l => l.id), [roleFilteredLeads]);
  const commentCounts = useLeadCommentCounts(leadIds);

  const filtered = useMemo(() => {
    let result = roleFilteredLeads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.project || "").toLowerCase().includes(q) ||
        (l.source || "").toLowerCase().includes(q)
      );
    }
    if (filterAssigned !== "all") result = result.filter(l => l.assigned_to === filterAssigned);
    if (filterProject !== "all") result = result.filter(l => l.project === filterProject);

    result = [...result].sort((a, b) => {
      if (sortBy === "score") return calcLeadScore(b) - calcLeadScore(a);
      if (sortBy === "date") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return (stageOrder[a.status || "Qualified"] ?? 99) - (stageOrder[b.status || "Qualified"] ?? 99);
    });
    return result;
  }, [roleFilteredLeads, search, filterAssigned, filterProject, sortBy]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (isViewer) return;
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const leadId = result.draggableId;
    if (leads.find(l => l.id === leadId)?.status === newStatus) return;
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId).eq("org_id", orgId!);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success("Status updated");
    invalidate();
  }, [leads, isViewer]);

  const openDrawer = (lead: Tables<"leads">, tab = "details") => {
    setSelectedLead(lead);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const openDrawerComments = (lead: Tables<"leads">) => openDrawer(lead, "comments");

  if (!orgId) {
    return (
      <DashboardLayout title="CRM" subtitle="Lead pipeline management">
        <div className="space-y-4 py-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="CRM" subtitle="Lead pipeline management">
        <ErrorState message="Error loading leads data" onRetry={refetch} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM" subtitle="Lead pipeline management">
      <div className="page-fade-in">
      {!isViewer && <PageAIBanner page="crm" />}

      <CRMTopBar
        search={search} onSearchChange={setSearch}
        viewMode={viewMode} onViewModeChange={setViewMode}
        sortBy={sortBy} onSortChange={setSortBy}
        filterAssigned={filterAssigned} onFilterAssignedChange={setFilterAssigned}
        filterProject={filterProject} onFilterProjectChange={setFilterProject}
        assignedOptions={assignedOptions} projectOptions={projectOptions}
        onAddClick={() => setAddOpen(true)}
        hideAssignedFilter={!canSeeAll}
        hideAddLead={!canAdd || isViewer}
        leadScoringOn={leadScoringOn}
        onLeadScoringToggle={setLeadScoringOn}
        isViewer={isViewer}
      />

      <CRMStatsBar leads={roleFilteredLeads} />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 && !search && filterAssigned === "all" && filterProject === "all" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground">
            {!canSeeAll ? "No leads assigned to you yet" : "No leads yet"}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <CRMKanbanBoard leads={filtered} isLoading={false} onDragEnd={onDragEnd} onLeadClick={openDrawer} />
      ) : (
        <CRMTableView
          leads={filtered}
          onLeadClick={openDrawer}
          onLeadCommentClick={openDrawerComments}
          orgMembers={orgMembers}
          userRole={userRole}
          leadScoringOn={leadScoringOn}
          canAssign={canAssign}
          canDelete={canDelete}
          isViewer={isViewer}
        />
      )}

      <CRMLeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        orgMembers={orgMembers}
        defaultTab={drawerTab}
        userRole={userRole}
        leadScoringOn={leadScoringOn}
        isViewer={isViewer}
      />

      {canAdd && !isViewer && (
        <CRMAddLeadModal
          open={addOpen}
          onOpenChange={setAddOpen}
          orgId={orgId}
          projectOptions={projectOptions}
          orgMembers={orgMembers}
        />
      )}
      </div>
    </DashboardLayout>
  );
};

export default CRM;
