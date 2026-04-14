import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartsRadar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitors: Tables<"competitors">[];
  intel: Tables<"competitor_intel">[];
  benchmarks: Tables<"market_benchmarks">[];
}

export function MarketPosition({ competitors, intel, benchmarks }: Props) {
  const [trendMetric, setTrendMetric] = useState("ad_spend");

  // Aggregate latest metrics per competitor for radar chart
  const radarData = useMemo(() => {
    const metrics = ["ad_spend", "social_followers", "social_engagement", "website_traffic", "review_score", "seo_ranking"];
    const labels: Record<string, string> = {
      ad_spend: "Ad Spend", social_followers: "Followers", social_engagement: "Engagement",
      website_traffic: "Traffic", review_score: "Reviews", seo_ranking: "SEO",
    };

    // Get top 3 competitors by intel count
    const topCompetitors = [...competitors]
      .map(c => ({ ...c, intelCount: intel.filter(i => i.competitor_id === c.id).length }))
      .sort((a, b) => b.intelCount - a.intelCount)
      .slice(0, 3);

    if (topCompetitors.length === 0) return { data: [], subjects: [] };

    // Normalize: find max per metric across all competitors
    const maxByMetric: Record<string, number> = {};
    metrics.forEach(m => {
      let max = 0;
      competitors.forEach(c => {
        const latest = intel.find(i => i.competitor_id === c.id && i.intel_type === m);
        const val = latest ? Number(latest.value) || 0 : 0;
        if (val > max) max = val;
      });
      maxByMetric[m] = max || 1;
    });

    const data = metrics.map(m => {
      const row: Record<string, string | number> = { metric: labels[m] || m };
      topCompetitors.forEach(c => {
        const latest = intel.find(i => i.competitor_id === c.id && i.intel_type === m);
        const val = latest ? Number(latest.value) || 0 : 0;
        row[c.name] = Math.round((val / maxByMetric[m]) * 100);
      });
      return row;
    });

    return { data, subjects: topCompetitors.map(c => c.name) };
  }, [competitors, intel]);

  // Horizontal bar data
  const barData = useMemo(() => {
    const types = [
      { key: "ad_spend", label: "Ad Spend", color: "#A855F7" },
      { key: "social_followers", label: "Followers", color: "#3B82F6" },
      { key: "social_engagement", label: "Engagement", color: "#EC4899" },
      { key: "website_traffic", label: "Traffic", color: "#6366F1" },
    ];
    return types.map(t => {
      const entries = competitors.map(c => {
        const latest = intel.find(i => i.competitor_id === c.id && i.intel_type === t.key);
        return { name: c.name, value: latest ? Number(latest.value) || 0 : 0 };
      }).filter(e => e.value > 0).sort((a, b) => b.value - a.value);
      const max = entries.length > 0 ? entries[0].value : 1;
      return { ...t, entries, max };
    }).filter(t => t.entries.length > 0);
  }, [competitors, intel]);

  // Trend data
  const trendData = useMemo(() => {
    const entries = intel
      .filter(i => i.intel_type === trendMetric)
      .sort((a, b) => new Date(a.captured_at || a.created_at).getTime() - new Date(b.captured_at || b.created_at).getTime());

    const byDate: Record<string, Record<string, number>> = {};
    entries.forEach(i => {
      const date = new Date(i.captured_at || i.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (!byDate[date]) byDate[date] = {};
      const name = competitors.find(c => c.id === i.competitor_id)?.name || "Unknown";
      byDate[date][name] = Number(i.value) || 0;
    });

    return Object.entries(byDate).map(([date, vals]) => ({ date, ...vals }));
  }, [intel, trendMetric, competitors]);

  const competitorNames = [...new Set(competitors.map(c => c.name))].slice(0, 4);
  const COLORS = ["#A855F7", "#3B82F6", "#22C55E", "#F97316"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Market Position</h3>
      </div>

      {barData.length === 0 && benchmarks.length === 0 && radarData.data.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-10 w-10 text-primary/15 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Add competitor intel data to see market positioning charts.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        {radarData.data.length > 0 && (
          <div className="glass-card border border-border/50 rounded-xl p-5 section-glow">
            <h4 className="text-xs font-semibold text-foreground mb-4 font-mono">COMPETITIVE RADAR</h4>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData.data} outerRadius="75%">
                <PolarGrid stroke="hsl(0 0% 100% / 0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(0 0% 75%)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} />
                {radarData.subjects.map((name, i) => (
                  <RechartsRadar key={name} name={name} dataKey={name}
                    stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.1} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} />
                <Tooltip contentStyle={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 20%)", borderRadius: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Benchmark bars */}
        {benchmarks.length > 0 && (
          <div className="glass-card border border-border/50 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-foreground mb-4 font-mono">MARKET BENCHMARKS</h4>
            <div className="space-y-4">
              {benchmarks.map(b => {
                const benchmark = Number(b.benchmark_value) || 0;
                const ours = Number(b.our_value) || 0;
                const delta = benchmark > 0 ? ((ours - benchmark) / benchmark) * 100 : 0;
                const isAbove = delta >= 0;
                const maxVal = Math.max(benchmark, ours, 1);
                return (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">{b.metric_name}</span>
                      <span className={cn("text-[10px] font-mono font-bold", isAbove ? "text-green-400" : "text-red-400")}>
                        {isAbove ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    </div>
                    {/* Benchmark bar */}
                    <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="absolute h-full rounded-full bg-muted-foreground/20"
                        style={{ width: `${(benchmark / maxVal) * 100}%` }} />
                      <div className={cn("absolute h-full rounded-full", isAbove ? "bg-green-500/60" : "bg-red-500/60")}
                        style={{ width: `${(ours / maxVal) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                      <span>Ours: {ours.toLocaleString()} {b.unit || ""}</span>
                      <span>Benchmark: {benchmark.toLocaleString()} {b.unit || ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Horizontal bar comparisons */}
      {barData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {barData.map(mt => (
            <div key={mt.key} className="glass-card border border-border/50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 font-mono">{mt.label.toUpperCase()}</h4>
              <div className="space-y-2">
                {mt.entries.map((c, i) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground truncate">{c.name}</span>
                      <span className="text-[10px] font-mono font-bold text-foreground">{c.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(c.value / mt.max) * 100}%`, backgroundColor: mt.color, opacity: 1 - (i * 0.15) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {trendData.length > 1 && (
        <div className="glass-card border border-border/50 rounded-xl p-5 section-glow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-foreground font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> TREND ANALYSIS
            </h4>
            <select value={trendMetric} onChange={e => setTrendMetric(e.target.value)}
              className="h-7 bg-secondary border border-border rounded-lg px-2 text-[10px] text-foreground font-mono">
              <option value="ad_spend">Ad Spend</option>
              <option value="social_followers">Followers</option>
              <option value="social_engagement">Engagement</option>
              <option value="website_traffic">Traffic</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(0 0% 60%)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} />
              <YAxis tick={{ fill: "hsl(0 0% 60%)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 20%)", borderRadius: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
              {competitorNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]} fillOpacity={0.08} strokeWidth={2} dot={false} />
              ))}
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
