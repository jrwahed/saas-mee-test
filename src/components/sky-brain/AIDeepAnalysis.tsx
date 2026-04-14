import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DeepAnalysisProps {
  campaigns: { campaign_name: string; spend: number | null; leads_count: number | null; cpl: number | null }[];
  metrics: {
    totalSpend: number; totalLeads: number; avgCpl: number;
    qualityRate: number; noAnswerRate: number; notInterestedRate: number; conversionRate: number;
    repMap: Record<string, { total: number; closed: number; noAnswer: number }>;
  };
}

const LOADING_TEXTS = [
  "جاري تحليل الحملات...",
  "جاري تقييم فريق المبيعات...",
  "جاري إعداد التوصيات...",
];

const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 0 });
const pct = (n: number) => n.toFixed(1);

export function AIDeepAnalysis({ campaigns, metrics: m }: DeepAnalysisProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const textInt = setInterval(() => {
      idx = (idx + 1) % LOADING_TEXTS.length;
      setLoadingText(LOADING_TEXTS[idx]);
    }, 4000);
    const progInt = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 95));
    }, 400);
    intervalRef.current = progInt;
    return () => { clearInterval(textInt); clearInterval(progInt); };
  }, [loading]);

  const repStats = Object.entries(m.repMap)
    .filter(([n]) => n !== "Unassigned" && n.trim())
    .map(([name, s]) => {
      const conv = s.total > 0 ? ((s.closed / s.total) * 100).toFixed(1) : "0";
      const na = s.total > 0 ? ((s.noAnswer / s.total) * 100).toFixed(1) : "0";
      return `${name}: ${s.total} ليد, ${s.closed} Closed, ${conv}% تحويل, ${na}% No Answer`;
    }).join("\n");

  const campaignsJson = campaigns.map(c => ({
    name: c.campaign_name, spend: c.spend || 0, leads: c.leads_count || 0, cpl: c.cpl || 0,
  }));

  const handleRun = async () => {
    setLoading(true);
    setProgress(0);
    setReport(null);

    const prompt = `البيانات الحقيقية:

- الحملات: ${JSON.stringify(campaignsJson, null, 2)}
- إجمالي الإنفاق: ${fmt(m.totalSpend)} جنيه
- إجمالي الليدز: ${m.totalLeads}
- متوسط CPL: ${fmt(m.avgCpl)} جنيه
- Quality Rate: ${pct(m.qualityRate)}%
- No Answer Rate: ${pct(m.noAnswerRate)}%
- Not Interested Rate: ${pct(m.notInterestedRate)}%
- معدل التحويل: ${pct(m.conversionRate)}%
- أداء الموظفين:
${repStats}

المعايير المرجعية:
- CPL: أقل من 250=ممتاز، 250-350=كويس، أعلى من 400=خطر
- Quality: 30-40%=كويس، أقل من 10%=خطر عاجل
- No Answer: أقل من 30%=طبيعي، أعلى من 50%=خطر
- Not Interested: أعلى من 10%=استهداف خاطئ
- Conversion: 1-2%=متوسط، 3-5%=ممتاز، 6%+=استثنائي

التشخيص:
- Quality منخفضة → Campaign ضعيفة → حلل Audience + Copy + Visuals
- No Answer عالي → Sales بطيء → راجع سرعة التواصل
- Not Interested عالي → Audience غلط → تعديل التارجت
- CPL عالي وQuality كويس → الميزانية قليلة → زود تدريجياً

المطلوب:

## القسم الأول: تحليل التسويق
1. تشخيص عام (فقرة واحدة)
2. تحليل كل حملة: الاسم + التقييم (ممتاز/كويس/ضعيف/خطر) + CPL + المشكلة + الإجراء
3. تحليل جودة الليدز: Quality Rate + No Answer Rate + Not Interested Rate مع التشخيص
4. 5 توصيات تسويقية مرتبة بالأولوية، لكل واحدة:
   ### التوصية [رقم]: [عنوان]
   **الأولوية:** حرجة/عالية/متوسطة
   **لماذا؟** [بالأرقام]
   **النتيجة المتوقعة:** [ماذا سيتغير]
   **خطوات التنفيذ:** 1. ... 2. ... 3. ...

## القسم الثاني: تحليل المبيعات
1. تقييم كل موظف بالاسم: التقييم + الليدز + Closed + Conversion% + No Answer% + نقاط القوة + نقاط الضعف + التوصية
2. تحليل قمع المبيعات — أين يتسرب العملاء
3. 5 توصيات لتحسين المبيعات (نفس الشكل)
4. خطة عمل أسبوعية لكل موظف بالاسم`;

    const systemPrompt = `أنت فريق من خبيرين: خبير تسويق أول + مدير مبيعات خبير. خبرة 15 سنة.

أسلوبك محترم ومهني — أنت مستشار بتساعد العميل يتحسن، مش بتحكم عليه.

القواعد المهمة:
- ابدأ دايماً بالإيجابيات قبل أي ملاحظة
- ممنوع كلمات سلبية زي: فشل، حرق فلوس، كارثة، وحش، ضعيف، خازوق
- بدل "ضعيف" قول "محتاج تحسين" أو "عنده فرصة يتطور"
- بدل "حرق فلوس" قول "ممكن نوجه الميزانية أحسن"
- بدل "خسارة" قول "محتاج نراجع الاستراتيجية"
- كل ملاحظة لازم يكون معاها حل أو اقتراح عملي
- العميل لازم يحس إنه بيتساعد مش بيتهاجم
- استخدم أرقام حقيقية في كل نقطة`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { prompt, systemPrompt, type: "sky-brain-deep" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setReport(null);
      } else {
        setReport(data?.report || "لم يتم إنشاء تقرير");
      }
    } catch (e: any) {
      if (import.meta.env.DEV) console.error(e);
      toast.error("حدث خطأ أثناء التحليل");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="section-header">التحليل العميق بالذكاء الاصطناعي</h2>
        <Brain className="h-4 w-4 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground mb-4" dir="rtl">تحليل شامل من خبراء الذكاء الاصطناعي</p>

      {!report && !loading && (
        <div className="flex justify-center">
          <Button onClick={handleRun} size="lg" className="bg-primary text-primary-foreground gap-2 px-8">
            <Brain className="h-5 w-5" /> Run Deep Analysis
          </Button>
        </div>
      )}

      {loading && (
        <Card className="border-border bg-card p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Brain className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 border-2 border-primary/30 border-t-primary rounded-full animate-spin" style={{ width: 50, height: 50, top: -5, left: -5 }} />
            </div>
            <p className="text-sm text-foreground font-medium" dir="rtl">{loadingText}</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">عادةً يستغرق 15-30 ثانية</p>
          </div>
        </Card>
      )}

      {report && !loading && (
        <div className="space-y-4">
          <Card className="border-border bg-card p-6 card-glow">
            <div className="prose prose-sm prose-invert max-w-none text-foreground" dir="rtl">
              {report.split("\n").map((line, i) => {
                if (line.startsWith("###")) return <h3 key={i} className="text-base font-bold text-foreground mt-4 mb-2 section-header">{line.replace(/^###\s*/, "")}</h3>;
                if (line.startsWith("##")) return <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-3 section-header">{line.replace(/^##\s*/, "")}</h2>;
                if (line.startsWith("**الأولوية:** حرجة")) return <p key={i} className="text-xs"><span className="bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold animate-pulse">حرجة</span></p>;
                if (line.startsWith("**الأولوية:** عالية")) return <p key={i} className="text-xs"><span className="bg-warning/20 text-warning px-2 py-0.5 rounded-full font-bold">عالية</span></p>;
                if (line.startsWith("**الأولوية:** متوسطة")) return <p key={i} className="text-xs"><span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">متوسطة</span></p>;
                if (line.startsWith("**النتيجة المتوقعة:**")) return <p key={i} className="text-sm bg-success/5 border-l-2 border-success p-2 rounded-r">{line.replace(/\*\*/g, "")}</p>;
                if (line.match(/^\*\*.*\*\*/)) return <p key={i} className="text-sm font-semibold text-foreground">{line.replace(/\*\*/g, "")}</p>;
                if (line.match(/^\d+\.\s/)) return <p key={i} className="text-sm text-foreground leading-relaxed pl-4">{line}</p>;
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>;
              })}
            </div>
          </Card>
          <div className="flex justify-center">
            <Button onClick={handleRun} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
