import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getThreatStyle, timeAgo, formatChange, getIntelType } from "./competitorUtils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitor: Tables<"competitors">;
  latestIntel: Tables<"competitor_intel">[];
  onClick: () => void;
}

const THREAT_GLOW_CLASS: Record<string, string> = {
  critical: "threat-glow-critical",
  high: "threat-glow-high",
  medium: "threat-glow-medium",
  low: "threat-glow-low",
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-[72px] h-[28px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#spark-${color.replace('#','')})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const CompetitorCard = memo(function CompetitorCard({ competitor, latestIntel, onClick }: Props) {
  const initials = competitor.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const threatLevel = (competitor.threat_level as string) || "low";
  const threatStyle = getThreatStyle(threatLevel);
  const glowClass = THREAT_GLOW_CLASS[threatLevel] || THREAT_GLOW_CLASS.low;

  // Check if there's recent intel (last 24h)
  const hasRecentIntel = latestIntel.some(i => {
    const d = new Date(i.captured_at || i.created_at);
    return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  });

  // Build sparkline data for up to 3 metrics
  const sparklines = useMemo(() => {
    const types = ["ad_spend", "social_followers", "social_engagement", "website_traffic", "review_score"];
    const colors: Record<string, string> = {
      ad_spend: "#A855F7", social_followers: "#3B82F6", social_engagement: "#22C55E",
      website_traffic: "#6366F1", review_score: "#EAB308",
    };
    const result: { type: string; label: string; icon: string; color: string; data: number[]; latest: number; change: ReturnType<typeof formatChange> }[] = [];

    for (const t of types) {
      if (result.length >= 3) break;
      const entries = latestIntel.filter(i => i.intel_type === t && i.value != null).slice(0, 8).reverse();
      if (entries.length >= 1) {
        const latest = entries[entries.length - 1];
        const info = getIntelType(t);
        result.push({
          type: t, label: info.label, icon: info.icon, color: colors[t] || "#A855F7",
          data: entries.map(e => Number(e.value) || 0),
          latest: Number(latest.value) || 0,
          change: formatChange(latest.value, latest.previous_value),
        });
      }
    }
    return result;
  }, [latestIntel]);

  const lastIntel = latestIntel[0];

  return (
    <div onClick={onClick}
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 cursor-pointer transition-all animate-fade-in-up relative",
        glowClass
      )}>
      {/* Recent intel indicator */}
      {hasRecentIntel && (
        <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-green-500 status-dot-pulse" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {competitor.logo_url ? (
            <img src={competitor.logo_url} alt={competitor.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-border/50" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-foreground ring-1 ring-border/50">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{competitor.name}</p>
            {competitor.industry && <p className="text-[10px] text-muted-foreground">{competitor.industry}</p>}
          </div>
        </div>
        <span className={cn("text-[10px] font-mono font-bold px-2 py-1 rounded-md border", threatStyle.bg, threatStyle.color)}>
          {threatStyle.label.toUpperCase()}
        </span>
      </div>

      {/* Sparkline metrics */}
      <div className="space-y-2.5 mb-3">
        {sparklines.map(s => (
          <div key={s.type} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px]">{s.icon}</span>
              <span className="text-[10px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <MiniSparkline data={s.data} color={s.color} />
              <div className="text-right min-w-[60px]">
                <span className="text-[10px] font-mono text-foreground">{s.latest.toLocaleString()}</span>
                {s.change && (
                  <span className={cn("text-[9px] font-mono ml-1",
                    s.type === "ad_spend" ? (s.change.positive ? "text-red-400" : "text-green-400") :
                    s.change.positive ? "text-green-400" : "text-red-400"
                  )}>{s.change.text}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {sparklines.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-2">No metrics tracked yet</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-primary">{latestIntel.length}</span>
          <span className="text-[10px] text-muted-foreground">intel pts</span>
        </div>
        {lastIntel && <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(lastIntel.captured_at)}</span>}
      </div>
    </div>
  );
});
