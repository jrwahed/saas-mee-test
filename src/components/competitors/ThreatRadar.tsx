import { useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { getThreatStyle } from "./competitorUtils";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitors: Tables<"competitors">[];
  intel: Tables<"competitor_intel">[];
}

const THREAT_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const THREAT_DISTANCE: Record<string, number> = {
  critical: 0.2,
  high: 0.4,
  medium: 0.65,
  low: 0.85,
};

export const ThreatRadar = memo(function ThreatRadar({ competitors, intel }: Props) {
  const stats = useMemo(() => {
    const threatCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    competitors.forEach(c => {
      const level = (c.threat_level as string) || "low";
      if (level in threatCounts) threatCounts[level as keyof typeof threatCounts]++;
    });
    const recentIntel = intel.filter(i => {
      const d = new Date(i.captured_at || i.created_at);
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const maxThreat = competitors.reduce((max, c) => {
      const levels = ["low", "medium", "high", "critical"];
      const idx = levels.indexOf((c.threat_level as string) || "low");
      return idx > max ? idx : max;
    }, 0);
    return { threatCounts, recentIntel, maxThreat, overallLevel: ["low", "medium", "high", "critical"][maxThreat] };
  }, [competitors, intel]);

  // Position competitors on radar
  const dots = useMemo(() => {
    return competitors.map((c, i) => {
      const level = (c.threat_level as string) || "low";
      const dist = THREAT_DISTANCE[level] || 0.85;
      // Spread angle evenly + slight randomness based on name hash
      const hash = c.name.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const baseAngle = (i / Math.max(competitors.length, 1)) * 360;
      const angle = (baseAngle + (hash % 30)) * (Math.PI / 180);
      const r = dist * 120; // radius relative to 120 center
      const cx = 150 + Math.cos(angle) * r;
      const cy = 150 + Math.sin(angle) * r;
      return { id: c.id, name: c.name, level, cx, cy, color: THREAT_COLORS[level] || THREAT_COLORS.low };
    });
  }, [competitors]);

  const threatStyle = getThreatStyle(stats.overallLevel);

  return (
    <div className="section-glow border border-border/50 rounded-2xl p-6 relative overflow-hidden glass-card">
      {threatStyle.pulse && (
        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-red-500 status-dot-pulse" />
      )}

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* SVG Radar */}
        <div className="relative w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] shrink-0">
          <svg viewBox="0 0 300 300" className="w-full h-full">
            {/* Fading grid rings */}
            {[0.25, 0.5, 0.75, 1].map((r, i) => (
              <circle key={i} cx="150" cy="150" r={r * 120} fill="none"
                stroke="hsl(0 0% 100% / 0.06)" strokeWidth="1" />
            ))}
            {/* Cross lines */}
            <line x1="150" y1="30" x2="150" y2="270" stroke="hsl(0 0% 100% / 0.04)" strokeWidth="1" />
            <line x1="30" y1="150" x2="270" y2="150" stroke="hsl(0 0% 100% / 0.04)" strokeWidth="1" />
            <line x1="65" y1="65" x2="235" y2="235" stroke="hsl(0 0% 100% / 0.03)" strokeWidth="1" />
            <line x1="235" y1="65" x2="65" y2="235" stroke="hsl(0 0% 100% / 0.03)" strokeWidth="1" />

            {/* Zone labels */}
            <text x="150" y="48" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="8" fontFamily="JetBrains Mono, monospace">LOW</text>
            <text x="150" y="82" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="8" fontFamily="JetBrains Mono, monospace">MEDIUM</text>
            <text x="150" y="115" textAnchor="middle" fill="hsl(0 0% 100% / 0.15)" fontSize="8" fontFamily="JetBrains Mono, monospace">HIGH</text>
            <text x="150" y="145" textAnchor="middle" fill="hsl(0 0% 100% / 0.2)" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">CRITICAL</text>

            {/* Rotating sweep line */}
            <g className="radar-sweep">
              <defs>
                <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(271 81% 56% / 0)" />
                  <stop offset="100%" stopColor="hsl(271 81% 56% / 0.4)" />
                </linearGradient>
                {/* Cone gradient for sweep trail */}
                <linearGradient id="sweepCone" gradientTransform="rotate(90)">
                  <stop offset="0%" stopColor="hsl(271 81% 56% / 0.15)" />
                  <stop offset="100%" stopColor="hsl(271 81% 56% / 0)" />
                </linearGradient>
              </defs>
              {/* Sweep trail (30-degree cone) */}
              <path d={`M 150 150 L ${150 + 120 * Math.cos(-Math.PI/12)} ${150 + 120 * Math.sin(-Math.PI/12)} A 120 120 0 0 1 ${150 + 120} ${150} Z`}
                fill="url(#sweepCone)" />
              {/* Main sweep line */}
              <line x1="150" y1="150" x2="270" y2="150" stroke="url(#sweepGrad)" strokeWidth="2" />
            </g>

            {/* Competitor dots */}
            {dots.map(dot => (
              <g key={dot.id}>
                {/* Outer pulse ring for critical/high */}
                {(dot.level === "critical" || dot.level === "high") && (
                  <circle cx={dot.cx} cy={dot.cy} r={dot.level === "critical" ? 10 : 7}
                    fill={dot.color} opacity="0.12" className="status-dot-pulse" />
                )}
                {/* Glow ring for all */}
                <circle cx={dot.cx} cy={dot.cy} r="6" fill={dot.color} opacity="0.08" />
                {/* Main dot */}
                <circle cx={dot.cx} cy={dot.cy} r="4" fill={dot.color} stroke="hsl(0 0% 100% / 0.2)" strokeWidth="0.5" opacity="0.95" />
                {/* Label on hover */}
                <title>{dot.name} — {dot.level.toUpperCase()}</title>
              </g>
            ))}

            {/* Center dot */}
            <circle cx="150" cy="150" r="3" fill="hsl(271 81% 56%)" opacity="0.8" />
          </svg>
        </div>

        {/* Stats panel */}
        <div className="flex-1 space-y-5">
          {/* Overall threat */}
          <div className="flex items-center gap-3">
            <div className={cn("text-xs font-bold font-mono px-3 py-1.5 rounded-lg border", threatStyle.bg, threatStyle.color)}>
              THREAT: {threatStyle.label.toUpperCase()}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {competitors.length} TARGETS TRACKED
            </div>
          </div>

          {/* Threat level counts */}
          <div className="grid grid-cols-4 gap-3">
            {(["critical", "high", "medium", "low"] as const).map(level => {
              const s = getThreatStyle(level);
              return (
                <div key={level} className={cn("text-center rounded-xl p-3 border", s.bg)}>
                  <p className={cn("text-2xl font-bold font-mono", s.color)}>{stats.threatCounts[level]}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Intel this week */}
          <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
            <span className="text-xs text-muted-foreground font-mono">INTEL THIS WEEK</span>
            <span className="text-2xl font-bold font-mono text-primary">{stats.recentIntel}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
