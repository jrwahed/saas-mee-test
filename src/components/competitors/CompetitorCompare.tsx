import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getIntelType, getThreatStyle } from "./competitorUtils";
import { GitCompare } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitors: Tables<"competitors">[];
  intel: Tables<"competitor_intel">[];
}

const COLORS = ["#A855F7", "#3B82F6", "#22C55E", "#F97316"];

export function CompetitorCompare({ competitors, intel }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareData = useMemo(() => {
    if (selectedIds.length < 2) return null;
    const metrics = ["ad_spend", "social_followers", "social_engagement", "website_traffic", "review_score"];
    const data: { metric: string; label: string; icon: string; values: Record<string, number>; trendData: Record<string, number[]> }[] = [];

    metrics.forEach(m => {
      const info = getIntelType(m);
      const values: Record<string, number> = {};
      const trendData: Record<string, number[]> = {};
      selectedIds.forEach(cId => {
        const entries = intel.filter(i => i.competitor_id === cId && i.intel_type === m && i.value != null)
          .slice(0, 8).reverse();
        const latest = entries.length > 0 ? entries[entries.length - 1] : null;
        values[cId] = latest ? Number(latest.value) || 0 : 0;
        trendData[cId] = entries.map(e => Number(e.value) || 0);
      });
      if (Object.values(values).some(v => v > 0)) {
        data.push({ metric: m, label: info.label, icon: info.icon, values, trendData });
      }
    });
    return data;
  }, [selectedIds, intel]);

  const selected = competitors.filter(c => selectedIds.includes(c.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Compare Competitors</h3>
      </div>
      <p className="text-xs text-muted-foreground">Select 2-3 competitors to compare side by side</p>

      {/* Selector pills */}
      <div className="flex flex-wrap gap-2">
        {competitors.map(c => {
          const isSelected = selectedIds.includes(c.id);
          const colorIdx = isSelected ? selectedIds.indexOf(c.id) : -1;
          const tStyle = getThreatStyle((c.threat_level as string) || "low");
          return (
            <button key={c.id} onClick={() => toggleSelect(c.id)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-mono",
                isSelected
                  ? "border-primary/50 text-foreground"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20")
              }
              style={isSelected ? { backgroundColor: `${COLORS[colorIdx]}15`, borderColor: `${COLORS[colorIdx]}40` } : undefined}>
              <span className="flex items-center gap-1.5">
                {isSelected && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[colorIdx] }} />}
                {c.name}
                <span className={cn("text-[9px] px-1 rounded", tStyle.bg, tStyle.color)}>{tStyle.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Comparison table */}
      {compareData && compareData.length > 0 && (
        <div className="glass-card border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left text-[10px] text-muted-foreground font-mono font-medium p-3 w-28">METRIC</th>
                {selected.map((c, i) => (
                  <th key={c.id} className="text-center text-[10px] font-mono font-medium p-3" style={{ color: COLORS[i % COLORS.length] }}>
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareData.map(row => {
                const maxVal = Math.max(...Object.values(row.values), 1);
                return (
                  <tr key={row.metric} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{row.icon}</span>
                        <span className="text-xs text-foreground font-medium">{row.label}</span>
                      </div>
                    </td>
                    {selected.map((c, ci) => {
                      const val = row.values[c.id] || 0;
                      const isMax = val === maxVal && val > 0;
                      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                      const trend = row.trendData[c.id] || [];
                      const color = COLORS[ci % COLORS.length];
                      return (
                        <td key={c.id} className="p-3">
                          <div className="space-y-1.5">
                            {/* Value */}
                            <div className="text-center">
                              <span className={cn("text-sm font-mono font-bold",
                                isMax ? "text-primary" : "text-foreground"
                              )}>
                                {val > 0 ? val.toLocaleString() : "—"}
                              </span>
                              {isMax && val > 0 && (
                                <span className="text-[8px] ml-1 text-primary font-mono">BEST</span>
                              )}
                            </div>
                            {/* Bar */}
                            {val > 0 && (
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mx-2">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                            )}
                            {/* Mini sparkline */}
                            {trend.length >= 2 && (
                              <div className="flex justify-center">
                                <div className="w-[64px] h-[20px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend.map((v, i) => ({ v, i }))} margin={{ top: 1, right: 0, left: 0, bottom: 1 }}>
                                      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1}
                                        fill={color} fillOpacity={0.1} dot={false} isAnimationActive={false} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedIds.length >= 2 && (!compareData || compareData.length === 0) && (
        <div className="text-center py-8 glass-card border border-border/50 rounded-xl">
          <GitCompare className="h-8 w-8 text-primary/15 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No comparable data available for selected competitors.</p>
        </div>
      )}

      {selectedIds.length < 2 && (
        <div className="text-center py-10 glass-card border border-border/50 rounded-xl">
          <GitCompare className="h-10 w-10 text-primary/15 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select at least 2 competitors above to start comparing.</p>
        </div>
      )}
    </div>
  );
}
