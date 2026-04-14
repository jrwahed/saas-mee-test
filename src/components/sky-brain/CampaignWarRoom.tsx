import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Crosshair } from "lucide-react";

interface CampaignRow {
  campaign_name: string;
  spend: number | null;
  leads_count: number | null;
  cpl: number | null;
}

const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 0 });

function cplBadge(cpl: number) {
  if (cpl < 250) return { label: "ممتاز", cls: "bg-success/20 text-success" };
  if (cpl <= 350) return { label: "كويس", cls: "bg-primary/20 text-primary" };
  if (cpl <= 400) return { label: "ضعيف", cls: "bg-warning/20 text-warning" };
  return { label: "خطر", cls: "bg-destructive/20 text-destructive animate-pulse" };
}

function cplColor(cpl: number) {
  if (cpl < 250) return "text-success";
  if (cpl <= 350) return "text-primary";
  return "text-destructive";
}

function cplVerdict(cpl: number) {
  if (cpl < 250) return "أداء ممتاز — فرصة لزيادة الميزانية";
  if (cpl <= 350) return "أداء جيد — استمر مع تحسينات طفيفة";
  if (cpl <= 400) return "يحتاج تحسين — راجع الاستهداف والمحتوى";
  return "خطر — أوقف وراجع الحملة فوراً";
}

export function CampaignWarRoom({ campaigns }: { campaigns: CampaignRow[] }) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="section-header">غرفة عمليات الحملات</h2>
        <Crosshair className="h-4 w-4 text-primary" />
      </div>
      {campaigns.length === 0 ? (
        <Card className="border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground" dir="rtl">لا توجد حملات بعد</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c, i) => {
            const cpl = c.cpl || 0;
            const badge = cplBadge(cpl);
            return (
              <Card
                key={i}
                className="border-border bg-card p-5 card-glow cursor-pointer hover:border-primary/40 transition-all"
                onClick={() => navigate("/campaigns")}
              >
                {/* Top */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground truncate flex-1" dir="rtl">{c.campaign_name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {/* Middle: stats */}
                <div className="flex items-center justify-between gap-2 mb-4 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">CPL</p>
                    <p className={`text-sm font-bold ${cplColor(cpl)}`}>{fmt(cpl)}</p>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                    <p className="text-sm font-bold text-foreground">{c.leads_count || 0}</p>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Spend</p>
                    <p className="text-sm font-bold text-foreground">{fmt(c.spend || 0)}</p>
                  </div>
                </div>
                {/* Bottom: verdict */}
                <p className="text-xs text-muted-foreground leading-relaxed" dir="rtl">
                  {cplVerdict(cpl)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
