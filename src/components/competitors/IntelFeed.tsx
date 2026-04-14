import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getIntelType, timeAgo, formatChange } from "./competitorUtils";
import {
  Eye, TrendingUp, Users, Globe, Megaphone, DollarSign, Newspaper,
  Package, UserPlus, Star, BarChart3, FileText, Pin, Search,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  intel: Tables<"competitor_intel">[];
  competitors: Tables<"competitors">[];
  compact?: boolean;
}

const INTEL_ICONS: Record<string, React.ReactNode> = {
  ad_spend: <DollarSign className="h-3.5 w-3.5" />,
  social_followers: <Users className="h-3.5 w-3.5" />,
  social_engagement: <TrendingUp className="h-3.5 w-3.5" />,
  new_campaign: <Megaphone className="h-3.5 w-3.5" />,
  pricing_change: <DollarSign className="h-3.5 w-3.5" />,
  new_product: <Package className="h-3.5 w-3.5" />,
  hiring: <UserPlus className="h-3.5 w-3.5" />,
  review_score: <Star className="h-3.5 w-3.5" />,
  website_traffic: <Globe className="h-3.5 w-3.5" />,
  seo_ranking: <BarChart3 className="h-3.5 w-3.5" />,
  content_published: <FileText className="h-3.5 w-3.5" />,
  news: <Newspaper className="h-3.5 w-3.5" />,
  custom: <Pin className="h-3.5 w-3.5" />,
};

function getTimeGroup(dateStr: string | null): string {
  if (!dateStr) return "Older";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0 && d.getDate() === now.getDate()) return "Today";
  if (diffDays <= 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 30) return "This Month";
  return "Older";
}

export function IntelFeed({ intel, competitors, compact }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [competitorFilter, setCompetitorFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const competitorMap = new Map(competitors.map(c => [c.id, c.name]));

  const filtered = intel
    .filter(i => typeFilter === "all" || i.intel_type === typeFilter)
    .filter(i => competitorFilter === "all" || i.competitor_id === competitorFilter);

  const types = [...new Set(intel.map(i => i.intel_type))];
  const displayCount = compact && !expanded ? 5 : 100;
  const displayItems = filtered.slice(0, displayCount);

  // Group by time
  const grouped = useMemo(() => {
    if (compact) return null; // Don't group in compact mode
    const groups: { label: string; items: typeof displayItems }[] = [];
    const order = ["Today", "Yesterday", "This Week", "This Month", "Older"];
    const map = new Map<string, typeof displayItems>();

    displayItems.forEach(item => {
      const group = getTimeGroup(item.captured_at);
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    });

    order.forEach(label => {
      const items = map.get(label);
      if (items && items.length > 0) groups.push({ label, items });
    });

    return groups;
  }, [displayItems, compact]);

  const renderEntry = (item: Tables<"competitor_intel">) => {
    const type = getIntelType(item.intel_type);
    const change = formatChange(item.value, item.previous_value);
    const borderClass = `intel-border-${item.intel_type}`;
    const icon = INTEL_ICONS[item.intel_type] || INTEL_ICONS.custom;

    return (
      <div key={item.id}
        className={cn(
          "glass-card border border-border/50 rounded-xl p-4 animate-fade-in-up border-l-[3px]",
          borderClass
        )}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("p-1 rounded-md bg-secondary/80", type.color)}>{icon}</span>
            <span className={cn("text-xs font-medium", type.color)}>{type.label}</span>
            <span className="text-[10px] bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
              {competitorMap.get(item.competitor_id) || "Unknown"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">{timeAgo(item.captured_at)}</span>
        </div>
        <p className="text-sm text-foreground mt-1.5">{item.title}</p>
        {item.value != null && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-mono font-bold text-foreground">{Number(item.value).toLocaleString()} {item.unit || ""}</span>
            {change && (
              <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5",
                change.positive ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
              )}>
                {change.positive ? "↑" : "↓"} {change.text}
              </span>
            )}
          </div>
        )}
        {item.source && item.source !== "manual" && (
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">SRC: {item.source}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Intelligence Feed
          {filtered.length > 0 && (
            <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{filtered.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <select value={competitorFilter} onChange={e => setCompetitorFilter(e.target.value)}
            className="h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground">
            <option value="all">All Competitors</option>
            {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground">
            <option value="all">All Types</option>
            {types.map(t => {
              const info = getIntelType(t);
              return <option key={t} value={t}>{info.icon} {info.label}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <Search className="h-8 w-8 text-primary/15 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No intel entries yet. Add competitors and track their moves.</p>
          </div>
        )}

        {/* Grouped view for full mode */}
        {grouped ? (
          grouped.map(group => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center gap-2 mt-3 first:mt-0">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[9px] font-mono text-muted-foreground/60">{group.items.length}</span>
              </div>
              {group.items.map(renderEntry)}
            </div>
          ))
        ) : (
          displayItems.map(renderEntry)
        )}
      </div>

      {compact && filtered.length > 5 && (
        <button onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors font-mono">
          {expanded ? "Show Less" : `View All (${filtered.length})`}
        </button>
      )}
    </div>
  );
}
