import { Users, Sparkles, TrendingUp, Activity, Minus, CheckCircle, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { AnimatedCounter } from "@/components/AnimatedCounter";

interface Props {
  leads: Tables<"leads">[];
}

const borderColors = [
  "hsl(271 81% 56%)",    // lime
  "hsl(187 92% 42%)",   // cyan (Fresh)
  "hsl(0 84% 60%)",     // red
  "hsl(38 92% 50%)",    // amber
  "hsl(217 91% 60%)",   // blue
  "hsl(142 71% 45%)",   // green
  "hsl(0 84% 60%)",     // red
];

export function CRMStatsBar({ leads }: Props) {
  const fresh = leads.filter(l => l.status === "Fresh").length;
  const hot = leads.filter(l => ["Qualified", "Meeting / Visit Scheduled", "Follow-up / Re-call"].includes(l.status || "")).length;
  const warm = leads.filter(l => ["Reserved / Under Contract", "Postponed / Future Interest"].includes(l.status || "")).length;
  const cold = leads.filter(l => ["No Answer", "Unreachable"].includes(l.status || "")).length;
  const closed = leads.filter(l => l.status === "Sold / Closed Won").length;
  const lost = leads.filter(l => ["Not Interested", "Low Budget", "Wrong Number / Inquiries", "Junk / Trash"].includes(l.status || "")).length;

  const stats = [
    { val: leads.length, label: "Total Leads", icon: Users, iconColor: "text-foreground" },
    { val: fresh, label: "Fresh", icon: Sparkles, iconColor: "text-cyan-400" },
    { val: hot, label: "Hot Leads", icon: TrendingUp, iconColor: "text-red-400" },
    { val: warm, label: "Warm Leads", icon: Activity, iconColor: "text-yellow-400" },
    { val: cold, label: "Cold Leads", icon: Minus, iconColor: "text-muted-foreground" },
    { val: closed, label: "Closed", icon: CheckCircle, iconColor: "text-green-400" },
    { val: lost, label: "Lost", icon: XCircle, iconColor: "text-destructive" },
  ];

  return (
    <div className="mb-5">
      <div className="grid grid-cols-4 md:grid-cols-7 gap-3 stagger-children">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-4 card-glow animate-fade-in-up hover:border-primary/20 transition-all"
            style={{ borderLeft: `3px solid ${borderColors[i]}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
              <AnimatedCounter value={String(s.val)} className="text-2xl font-bold text-foreground font-mono" />
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground mt-2 px-1">
        Fresh = ليدز جديدة لم يتم التواصل معها | Hot = جاري التواصل | Warm = حجز مبدئي | Cold = لا يرد
      </p>
    </div>
  );
}
