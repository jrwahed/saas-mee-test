import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface RepStats {
  name: string;
  total: number;
  closed: number;
  noAnswer: number;
  convRate: number;
  noAnswerRate: number;
}

function convBadge(rate: number) {
  if (rate > 3) return { label: "ممتاز", cls: "bg-success/20 text-success" };
  if (rate >= 1) return { label: "كويس", cls: "bg-primary/20 text-primary" };
  return { label: "ضعيف", cls: "bg-destructive/20 text-destructive" };
}

function rankBorder(rank: number) {
  if (rank === 0) return "ring-2 ring-yellow-500";
  if (rank === 1) return "ring-2 ring-gray-400";
  if (rank === 2) return "ring-2 ring-amber-700";
  return "ring-1 ring-border";
}

function coachTip(convRate: number, noAnswerRate: number) {
  if (noAnswerRate > 50) return { text: "تحذير — سرعة الرد محتاجة تتحسن فوراً", cls: "text-destructive" };
  if (noAnswerRate > 30) return { text: "نصيحة — حاول تتواصل خلال أول 30 دقيقة", cls: "text-warning" };
  if (convRate > 3) return { text: "أداء ممتاز — شارك خبرتك مع الفريق", cls: "text-success" };
  if (convRate >= 1) return { text: "أداء جيد — ركز على المتابعة", cls: "text-primary" };
  return { text: "يحتاج تطوير — تواصل مع الليدز خلال أول ساعة", cls: "text-warning" };
}

function statColor(good: boolean) {
  return good ? "text-success" : "text-destructive";
}

export function SalesLeaderboard({ repMap }: { repMap: Record<string, { total: number; closed: number; noAnswer: number }> }) {
  const reps = useMemo(() => {
    return Object.entries(repMap)
      .filter(([name]) => name !== "Unassigned" && name.trim())
      .map(([name, s]) => ({
        name,
        total: s.total,
        closed: s.closed,
        noAnswer: s.noAnswer,
        convRate: s.total > 0 ? (s.closed / s.total) * 100 : 0,
        noAnswerRate: s.total > 0 ? (s.noAnswer / s.total) * 100 : 0,
      }))
      .sort((a, b) => b.convRate - a.convRate);
  }, [repMap]);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="section-header">أداء فريق المبيعات</h2>
        <Trophy className="h-4 w-4 text-primary" />
      </div>
      {reps.length === 0 ? (
        <Card className="border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground" dir="rtl">لا يوجد بيانات لفريق المبيعات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reps.map((rep, i) => {
            const badge = convBadge(rep.convRate);
            const tip = coachTip(rep.convRate, rep.noAnswerRate);
            return (
              <Card key={rep.name} className="border-border bg-card p-4 card-glow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Avatar + rank */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ${rankBorder(i)}`}>
                      {initials(rep.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">#{i + 1} {rep.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-wrap text-center flex-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Leads</p>
                      <p className="text-sm font-bold text-foreground">{rep.total}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Closed</p>
                      <p className={`text-sm font-bold ${statColor(rep.closed > 0)}`}>{rep.closed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Conversion</p>
                      <p className={`text-sm font-bold ${statColor(rep.convRate >= 1)}`}>{rep.convRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">No Answer</p>
                      <p className={`text-sm font-bold ${statColor(rep.noAnswerRate < 30)}`}>{rep.noAnswerRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  {/* Coach tip */}
                  <p className={`text-xs font-medium shrink-0 max-w-[220px] ${tip.cls}`} dir="rtl">{tip.text}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
