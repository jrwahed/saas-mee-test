import { Brain } from "lucide-react";

interface InsightItem {
  emoji: string;
  label: string;
  text: string;
}

interface PageAISectionProps {
  title: string;
  insights: InsightItem[];
}

export function PageAISection({ title, insights }: PageAISectionProps) {
  return (
    <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto">Updated just now</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((item, i) => (
          <div key={i} className="bg-card rounded-lg p-3 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              {item.emoji} {item.label}
            </p>
            <p className="text-xs text-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
