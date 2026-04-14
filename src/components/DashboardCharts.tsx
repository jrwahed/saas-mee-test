import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-glow animate-fade-in-up">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-foreground">
          {entry.name}: {typeof entry.value === "number"
            ? entry.name.toLowerCase().includes("spend")
              ? `${entry.value.toLocaleString()} EGP`
              : entry.value.toLocaleString()
            : entry.value}
        </p>
      ))}
    </div>
  );
};

interface SpendChartProps {
  data?: { name: string; spend: number }[];
  isLoading?: boolean;
}

export function SpendChart({ data = [], isLoading }: SpendChartProps) {
  return (
    <ChartCard title="Spend per Campaign" subtitle="Ad spend breakdown by campaign">
      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No campaign data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(271 81% 56% / 0.05)" }} />
            <Bar dataKey="spend" fill="hsl(271 81% 56%)" radius={[6, 6, 0, 0]} fillOpacity={0.8} name="Spend" animationDuration={1500} animationBegin={300} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

interface LeadsChartProps {
  data?: { date: string; leads: number }[];
  isLoading?: boolean;
}

export function LeadsChart({ data = [], isLoading }: LeadsChartProps) {
  return (
    <ChartCard title="Leads Over Time" subtitle="Daily lead acquisition trend">
      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No lead data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(271 81% 56%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(271 81% 56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="leads" stroke="hsl(271 81% 56%)" strokeWidth={2.5} fill="url(#leadGradient)" name="Leads" animationDuration={1500} animationBegin={300} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
