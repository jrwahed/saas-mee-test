import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { KANBAN_COLUMNS } from "./taskUtils";
import { TaskCard } from "./TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  tasks: Tables<"tasks">[];
  isLoading: boolean;
  onDragEnd: (result: DropResult) => void;
  onTaskClick: (task: Tables<"tasks">) => void;
}

export function TaskKanban({ tasks, isLoading, onDragEnd, onTaskClick }: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="min-w-[220px] flex-1 space-y-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(col => {
          const columnTasks = tasks.filter(t => (t.status || "pending") === col.id);
          return (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "min-w-[220px] flex-1 rounded-xl border border-border/50 bg-secondary/20 p-3 transition-colors",
                    snapshot.isDraggingOver && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", col.dotColor)} />
                      <span className="text-xs font-semibold text-foreground">{col.label}</span>
                    </div>
                    <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full font-mono font-semibold">
                      {columnTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 min-h-[60px]">
                    {columnTasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <TaskCard task={task} onClick={() => onTaskClick(task)} />
                          </div>
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
    </DragDropContext>
  );
}
