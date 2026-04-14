export const INTEL_TYPES = {
  ad_spend: { label: "Ad Spend", icon: "💰", color: "text-green-400" },
  social_followers: { label: "Social Followers", icon: "👥", color: "text-blue-400" },
  social_engagement: { label: "Social Engagement", icon: "❤️", color: "text-pink-400" },
  new_campaign: { label: "New Campaign", icon: "📢", color: "text-purple-400" },
  pricing_change: { label: "Pricing Change", icon: "💲", color: "text-yellow-400" },
  new_product: { label: "New Product", icon: "🆕", color: "text-cyan-400" },
  hiring: { label: "Hiring", icon: "🧑‍💼", color: "text-orange-400" },
  review_score: { label: "Review Score", icon: "⭐", color: "text-yellow-300" },
  website_traffic: { label: "Website Traffic", icon: "🌐", color: "text-indigo-400" },
  seo_ranking: { label: "SEO Ranking", icon: "📊", color: "text-teal-400" },
  content_published: { label: "Content", icon: "📝", color: "text-blue-300" },
  news: { label: "News", icon: "📰", color: "text-gray-400" },
  custom: { label: "Custom", icon: "📌", color: "text-muted-foreground" },
} as const;

export const THREAT_STYLES: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", pulse: true },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  low: { label: "Low", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
};

export function getIntelType(type: string) {
  return INTEL_TYPES[type as keyof typeof INTEL_TYPES] || INTEL_TYPES.custom;
}

export function getThreatStyle(level: string | null) {
  return THREAT_STYLES[level || "low"] || THREAT_STYLES.low;
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function formatChange(current: number | null, previous: number | null): { text: string; positive: boolean } | null {
  if (current == null || previous == null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
    positive: change > 0,
  };
}
