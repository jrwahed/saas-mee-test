import { Search, SlidersHorizontal, LayoutGrid, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrgMember } from "@/hooks/useOrgMembers";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  viewMode: "kanban" | "table";
  onViewModeChange: (v: "kanban" | "table") => void;
  filterAssignee: string;
  onFilterAssigneeChange: (v: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (v: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  orgMembers: OrgMember[];
}

export function TaskFilters({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filterAssignee,
  onFilterAssigneeChange,
  filterPriority,
  onFilterPriorityChange,
  filterCategory,
  onFilterCategoryChange,
  filterStatus,
  onFilterStatusChange,
  orgMembers,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter: Assignee */}
      <Select value={filterAssignee} onValueChange={onFilterAssigneeChange}>
        <SelectTrigger className="w-[160px]">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          <SelectValue placeholder="All Assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {orgMembers.map(m => (
            <SelectItem key={m.email} value={m.email}>{m.display_name || m.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filter: Priority */}
      <Select value={filterPriority} onValueChange={onFilterPriorityChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter: Category */}
      <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="marketing">Marketing</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="design">Design</SelectItem>
          <SelectItem value="content">Content</SelectItem>
          <SelectItem value="technical">Technical</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter: Status */}
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="assigned">Assigned</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>

      {/* View Toggle */}
      <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
        <Button
          variant={viewMode === "table" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("table")}
          className="rounded-none gap-1.5 text-xs"
        >
          <Table2 className="h-3.5 w-3.5" />Table
        </Button>
        <Button
          variant={viewMode === "kanban" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("kanban")}
          className="rounded-none gap-1.5 text-xs"
        >
          <LayoutGrid className="h-3.5 w-3.5" />Board
        </Button>
      </div>
    </div>
  );
}
