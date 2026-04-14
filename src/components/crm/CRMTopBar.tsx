import { Search, Plus, LayoutGrid, Table2, SlidersHorizontal, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ViewMode, SortOption } from "./crmUtils";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  filterAssigned: string;
  onFilterAssignedChange: (v: string) => void;
  filterProject: string;
  onFilterProjectChange: (v: string) => void;
  assignedOptions: string[];
  projectOptions: string[];
  onAddClick: () => void;
  hideAssignedFilter?: boolean;
  hideAddLead?: boolean;
  leadScoringOn?: boolean;
  onLeadScoringToggle?: (v: boolean) => void;
  isViewer?: boolean;
}

export function CRMTopBar({
  search, onSearchChange, viewMode, onViewModeChange,
  sortBy, onSortChange, filterAssigned, onFilterAssignedChange,
  filterProject, onFilterProjectChange, assignedOptions, projectOptions, onAddClick,
  hideAssignedFilter, hideAddLead, leadScoringOn, onLeadScoringToggle, isViewer,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search leads..." value={search} onChange={e => onSearchChange(e.target.value)} className="pl-9" />
      </div>

      {/* Filter: Assigned To */}
      {!hideAssignedFilter && (
        <Select value={filterAssigned} onValueChange={onFilterAssignedChange}>
          <SelectTrigger className="w-[160px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="All Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {assignedOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* Filter: Project */}
      <Select value={filterProject} onValueChange={onFilterProjectChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={v => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="score">Score</SelectItem>
          <SelectItem value="date">Newest</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>

      {/* View Toggle */}
      {!isViewer && (
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" onClick={() => onViewModeChange("table")} className="rounded-none gap-1.5 text-xs">
            <Table2 className="h-3.5 w-3.5" />Table
          </Button>
          <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" onClick={() => onViewModeChange("kanban")} className="rounded-none gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" />Board
          </Button>
        </div>
      )}

      {/* Lead Scoring Toggle */}
      {!isViewer && (
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Lead Scoring</span>
          <Switch checked={leadScoringOn} onCheckedChange={onLeadScoringToggle} />
        </div>
      )}

      {/* Add Lead */}
      {!hideAddLead && (
        <Button onClick={onAddClick} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" />Add Lead
        </Button>
      )}
    </div>
  );
}
