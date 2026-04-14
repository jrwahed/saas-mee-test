import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getThreatStyle, timeAgo, formatChange, getIntelType } from "./competitorUtils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type SocialLinks = {
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  [key: string]: string | null | undefined;
};

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

  // Extract social links and website
  const socialLinks = (competitor.social_links as SocialLinks) || {};
  const website = competitor.website;

  // Define social platforms with icons and colors
  const SOCIAL_PLATFORMS = [
    {
      key: "website",
      label: "Website",
      color: "#6366F1",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      getUrl: () => website,
    },
    {
      key: "facebook",
      label: "Facebook",
      color: "#1877F2",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      ),
      getUrl: () => socialLinks.facebook,
    },
    {
      key: "instagram",
      label: "Instagram",
      color: "#E1306C",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      ),
      getUrl: () => socialLinks.instagram,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      color: "#0A66C2",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      ),
      getUrl: () => socialLinks.linkedin,
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      color: "#1DA1F2",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      getUrl: () => socialLinks.twitter,
    },
    {
      key: "tiktok",
      label: "TikTok",
      color: "#69C9D0",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
        </svg>
      ),
      getUrl: () => socialLinks.tiktok,
    },
    {
      key: "youtube",
      label: "YouTube",
      color: "#FF0000",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
        </svg>
      ),
      getUrl: () => socialLinks.youtube,
    },
  ];

  // Filter platforms that have a valid URL
  const availableSocials = SOCIAL_PLATFORMS.filter(p => {
    const url = p.getUrl();
    return url && url.trim() !== "";
  });

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

      {/* Social Links */}
      {availableSocials.length > 0 && (
        <div className="flex items-center gap-2 pt-2.5 pb-1">
          {availableSocials.map(platform => {
            const url = platform.getUrl();
            return (
              <a
                key={platform.key}
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                title={platform.label}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center h-6 w-6 rounded-md transition-all hover:scale-110"
                style={{
                  color: platform.color,
                  backgroundColor: `${platform.color}18`,
                }}
              >
                {platform.icon}
              </a>
            );
          })}
        </div>
      )}

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
