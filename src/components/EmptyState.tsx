import { LucideIcon, SearchX } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
          <Icon className="h-12 w-12 text-muted-foreground/40 status-dot-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
          <SearchX className="h-4 w-4 text-muted-foreground/60" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium" dir="rtl">{message}</p>
    </div>
  );
}
