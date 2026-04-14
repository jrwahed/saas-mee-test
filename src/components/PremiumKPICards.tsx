import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  MoreHorizontal,
  Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/AnimatedCounter";

interface BadgeInfo {
  label: string;
  colorClass: string;
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading?: boolean;
  iconColorClass?: string;
  badge?: BadgeInfo | null;
  borderColor?: string;
}

/* Mini sparkline SVG (decorative) */
function MiniSparkline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 20" className="w-20 h-5 opacity-30" preserveAspectRatio="none">
      <polyline
        points="0,16 10,14 20,12 30,15 40,10 50,8 60,11 70,6 80,4"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KPICard({ title, value, icon: Icon, isLoading, iconColorClass, badge, borderColor }: KPICardProps) {
  const iconColor = iconColorClass || "bg-primary/10 border-primary/20 text-primary";
  const leftBorder = borderColor || "hsl(271 81% 56%)";

  return (
    <div
      className="bg-card border border-border rounded-xl p-6 card-glow animate-fade-in-up relative overflow-hidden group"
      style={{ borderLeft: `3px solid ${leftBorder}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
        </div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <AnimatedCounter
              value={value}
              className="text-3xl font-bold text-foreground tracking-tight font-mono"
            />
          )}
        </div>
        <MiniSparkline color={leftBorder} />
      </div>

      {badge && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${badge.colorClass}`}>
            {badge.label}
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 0 });

interface PremiumKPICardsProps {
  totalSpend?: number;
  totalLeads?: number;
  cpl?: number;
  conversionRate?: number;
  dealsClosed?: number;
  revenue?: number;
  isLoading?: boolean;
}

export function PremiumKPICards({
  totalSpend = 0, totalLeads = 0, cpl = 0, conversionRate = 0,
  dealsClosed = 0, revenue = 0,
  isLoading,
}: PremiumKPICardsProps) {
  const cplBadge: BadgeInfo = cpl === 0
    ? { label: "لا توجد بيانات", colorClass: "bg-muted text-muted-foreground" }
    : cpl < 420
      ? { label: "أفضل من السوق", colorClass: "bg-success/15 text-success" }
      : { label: "أعلى من السوق", colorClass: "bg-destructive/15 text-destructive" };

  const convBadge: BadgeInfo = conversionRate === 0
    ? { label: "لا توجد بيانات", colorClass: "bg-muted text-muted-foreground" }
    : conversionRate >= 2
      ? { label: "أعلى من المعدل", colorClass: "bg-success/15 text-success" }
      : { label: "أقل من المعدل", colorClass: "bg-destructive/15 text-destructive" };

  const kpiData: KPICardProps[] = [
    { title: "Total Spend", value: `${fmt(totalSpend)} EGP`, icon: DollarSign, badge: { label: "إجمالي الإنفاق", colorClass: "bg-muted text-muted-foreground" }, borderColor: "hsl(271 81% 56%)" },
    { title: "Total Leads", value: fmt(totalLeads), icon: Users, badge: { label: `متوسط CPL: ${totalLeads > 0 ? fmt(cpl) : '—'} EGP`, colorClass: "bg-primary/15 text-primary" }, borderColor: "hsl(217 91% 60%)" },
    { title: "Cost per Lead", value: totalLeads === 0 ? "لا توجد ليدز" : `${fmt(cpl)} EGP`, icon: Target, badge: cplBadge, borderColor: "hsl(38 92% 50%)" },
    { title: "Conversion Rate", value: totalLeads === 0 ? "لا توجد بيانات" : `${conversionRate.toFixed(1)}%`, icon: TrendingUp, badge: convBadge, borderColor: "hsl(142 71% 45%)" },
    { title: "Deals Closed", value: fmt(dealsClosed), icon: Shield, badge: { label: `من ${fmt(totalLeads)} ليد`, colorClass: "bg-primary/15 text-primary" }, borderColor: "hsl(142 71% 45%)" },
  ];

  const topRow = kpiData.slice(0, 3);
  const bottomRow = kpiData.slice(3);

  return (
    <div className="space-y-4 stagger-children">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topRow.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} isLoading={isLoading} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bottomRow.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
