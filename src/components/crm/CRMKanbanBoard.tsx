import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { activePipelineStages, wonStages, lostInactiveStages, stages } from "./crmUtils";
import { CRMLeadCard } from "./CRMLeadCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  leads: Tables<"leads">[];
  isLoading: boolean;
  onDragEnd: (result: DropResult) => void;
  onLeadClick: (lead: Tables<"leads">) => void;
}

const sections = [
  { title: "Active Pipeline", borderColor: "border-l-[#C8FF00]", stages: activePipelineStages },
  { title: "Won", borderColor: "border-l-[#22C55E]", stages: wonStages },
  { title: "Lost / Inactive", borderColor: "border-l-[#EF4444]", stages: lostInactiveStages },
];

export function CRMKanbanBoard({ leads, isLoading, onDragEnd, onLeadClick }: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="min-w-[240px] flex-1 space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 overflow-x-auto pb-4">
        {sections.map(section => (
          <div key={section.title}>
            <div className={cn("border-l-4 pl-3 mb-3", section.borderColor)}>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{section.title}</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {section.stages.map(stage => {
                const columnLeads = leads.filter(l => (l.status || "Fresh") === stage.id);
                return (
                  <Droppable droppableId={stage.id} key={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-w-[240px] flex-1 rounded-xl border border-border/50 bg-secondary/20 p-3 transition-colors",
                          snapshot.isDraggingOver && "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                            <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                          </div>
                          <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full font-mono font-semibold">
                            {columnLeads.length}
                          </span>
                        </div>
                        <div className="space-y-2.5 min-h-[60px]">
                          {columnLeads.map((lead, idx) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                              {(prov, snap) => (
                                <CRMLeadCard
                                  lead={lead}
                                  provided={prov}
                                  snapshot={snap}
                                  onClick={() => onLeadClick(lead)}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
