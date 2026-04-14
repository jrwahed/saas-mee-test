import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Target, Users, ChevronDown, Lightbulb,
  AlertTriangle, Info, DollarSign, BarChart3, Calculator as CalcIcon,
  Brain, Loader2,
} from "lucide-react";
import mwLogo from "@/assets/mw-logo.svg";
import { supabase } from "@/integrations/supabase/client";

/* ────────────────────────────────── constants ────────────────────────────────── */
const ACCENT = "#C8FF00";

interface TypeBenchmark {
  cpl: number;
  conversion: number;
}

interface AreaBenchmark {
  name: string;
  types: Record<string, TypeBenchmark>;
  tips: string;
}

const AREA_BENCHMARKS: Record<string, AreaBenchmark> = {
  "6_october": {
    name: "6 أكتوبر",
    types: {
      "شقق سكنية": { cpl: 200, conversion: 1.6 },
      "فيلات": { cpl: 300, conversion: 1.2 },
      "شاليهات": { cpl: 280, conversion: 1.0 },
      "وحدات تجارية": { cpl: 350, conversion: 0.8 },
    },
    tips: "أكتوبر أقوى سوق في مصر دلوقتي — المنافسة شرسة بس الطلب عالي جداً. ركز على التقسيط الطويل (8-10 سنين) والمشاريع اللي عندها استلام قريب. الجمهور هنا بيهتم بالسعر أولاً والموقع ثانياً. استخدم فيديوهات قصيرة للمشروع مع CTA واضح. الـ Lookalike audiences على العملاء القدام بتجيب أحسن نتايج.",
  },
  "tagamoa": {
    name: "التجمع الخامس",
    types: {
      "شقق سكنية": { cpl: 300, conversion: 1.5 },
      "فيلات": { cpl: 350, conversion: 1.0 },
      "شاليهات": { cpl: 320, conversion: 0.8 },
      "وحدات تجارية": { cpl: 400, conversion: 0.7 },
    },
    tips: "التجمع من أجمد المناطق الفترة الجاية — لونشات كتير وطلب متزايد. الجمهور قدرته الشرائية عالية — ركز على الجودة والتشطيبات مش السعر. الفيديو بيشتغل أحسن من الصور بمراحل. استهدف سكان التجمع الحاليين + المهندسين + رجال الأعمال. Retargeting على زوار موقعك بيجيب conversion أعلى 3x.",
  },
  "new_capital": {
    name: "العاصمة الإدارية",
    types: {
      "شقق سكنية": { cpl: 280, conversion: 1.8 },
      "فيلات": { cpl: 340, conversion: 1.2 },
      "شاليهات": { cpl: 300, conversion: 0.9 },
      "وحدات تجارية": { cpl: 380, conversion: 1.0 },
    },
    tips: "العاصمة الإدارية سوق استثماري بالدرجة الأولى — الجمهور بيشتري عشان يستثمر مش يسكن. ركز على العائد الاستثماري والموقع الاستراتيجي والقرب من الحي الحكومي. استهدف المستثمرين ورجال الأعمال والموظفين الحكوميين اللي بيتنقلوا. الـ Lead Forms بتشتغل أحسن من الـ Messages.",
  },
  "mostakbal": {
    name: "مدينة المستقبل",
    types: {
      "شقق سكنية": { cpl: 270, conversion: 1.8 },
      "فيلات": { cpl: 330, conversion: 1.3 },
      "شاليهات": { cpl: 300, conversion: 0.9 },
      "وحدات تجارية": { cpl: 360, conversion: 0.8 },
    },
    tips: "المستقبل سيتي من أجمد المناطق الفترة الجاية — لونشات كتير وأسعار لسه مناسبة. الجمهور شباب ومتزوجين جدد — ركز على المساحات الصغيرة والتقسيط المريح. المشاريع تحت الإنشاء بأسعار تنافسية بتجذب المستثمرين الصغار. استخدم Carousel Ads بصور المشروع من زوايا مختلفة.",
  },
  "sheikh_zayed": {
    name: "الشيخ زايد",
    types: {
      "شقق سكنية": { cpl: 280, conversion: 1.4 },
      "فيلات": { cpl: 350, conversion: 1.0 },
      "شاليهات": { cpl: 310, conversion: 0.8 },
      "وحدات تجارية": { cpl: 380, conversion: 0.7 },
    },
    tips: "زايد من أجمد المناطق الفترة الجاية — لونشات جديدة كتير والطلب مستمر. الجمهور بيحب الرفاهية والمساحات الخضراء — ركز على الـ lifestyle والـ community. Instagram Reels بتشتغل هنا أكتر من أي حاجة. استهدف سكان زايد الحاليين + أكتوبر + المهندسين.",
  },
  "sahel": {
    name: "الساحل الشمالي",
    types: {
      "شقق سكنية": { cpl: 350, conversion: 1.0 },
      "فيلات": { cpl: 400, conversion: 0.8 },
      "شاليهات": { cpl: 280, conversion: 1.2 },
      "وحدات تجارية": { cpl: 420, conversion: 0.5 },
    },
    tips: "الساحل موسمي — ابدأ الحملات من مارس لأغسطس. ركز على الشاليهات والقرى السياحية الجديدة. الـ Urgency بتشتغل كويس جداً ('باقي 5 وحدات'). استهدف سكان القاهرة الكبرى الـ AB class. الفيديوهات الـ Drone بتجيب engagement عالي جداً.",
  },
  "ain_sokhna": {
    name: "العين السخنة",
    types: {
      "شقق سكنية": { cpl: 320, conversion: 1.0 },
      "فيلات": { cpl: 380, conversion: 0.8 },
      "شاليهات": { cpl: 260, conversion: 1.3 },
      "وحدات تجارية": { cpl: 400, conversion: 0.5 },
    },
    tips: "السخنة سوق weekend — القرب من القاهرة هو نقطة البيع الأولى. ركز على 'ساعة من القاهرة' و'استثمار + إجازة'. استهدف سكان القاهرة والتجمع. الحملات اللي فيها أسعار واضحة بتجيب leads أكتر.",
  },
};

const PROPERTY_TYPES = ["شقق سكنية", "فيلات", "شاليهات", "وحدات تجارية"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(n);

/* ─────────────────────── animated counter hook ─────────────────────── */
function useAnimatedNumber(target: number, active: boolean, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active) { setCurrent(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, active, duration]);

  return current;
}

/* ─────────────────────── dropdown component ─────────────────────── */
function Dropdown({
  label, value, onChange, options, displayValue,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { key: string; label: string }[];
  displayValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full h-11 bg-[#161616] border border-[#2A2A2A] rounded-lg px-4 text-sm text-white text-right flex items-center justify-between hover:border-[#C8FF00]/40 focus:border-[#C8FF00]/60 focus:ring-1 focus:ring-[#C8FF00]/30 transition-all"
        >
          <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className={value ? "text-white" : "text-neutral-500"}>{displayValue || "اختر..."}</span>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg shadow-xl overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-[#C8FF00]/10 transition-colors ${value === opt.key ? "text-[#C8FF00] bg-[#C8FF00]/5" : "text-neutral-300"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── diagnosis card ─────────────────────── */
function DiagnosisCard({
  borderColor, children,
}: {
  borderColor: string; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-4 transition-all duration-300 hover:shadow-lg"
      style={{ borderRightWidth: "4px", borderRightColor: borderColor }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                          MAIN CALCULATOR                              */
/* ═══════════════════════════════════════════════════════════════════════ */

const Calculator = () => {
  const [budget, setBudget] = useState(50000);
  const [areaKey, setAreaKey] = useState("6_october");
  const [propertyType, setPropertyType] = useState("شقق سكنية");
  const [showResults, setShowResults] = useState(false);
  const [resultsKey, setResultsKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // AI Analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState(false);

  const area = AREA_BENCHMARKS[areaKey];
  const typeBenchmark = area.types[propertyType] || area.types["شقق سكنية"];
  const areaCPL = typeBenchmark.cpl;

  const metrics = useMemo(() => {
    const leadsAvg = Math.round(budget / areaCPL);
    return { leadsAvg };
  }, [budget, areaCPL]);

  const animatedLeads = useAnimatedNumber(metrics.leadsAvg, showResults);
  const animatedCpl = useAnimatedNumber(areaCPL, showResults);

  const handleCalculate = () => {
    setShowResults(true);
    setResultsKey((k) => k + 1);
    setAiResult(null);
    setAiError(false);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(false);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("calculator-ai", {
        body: {
          area: areaKey,
          areaName: area.name,
          propertyType,
          budget,
          expectedLeads: metrics.leadsAvg,
          cpl: areaCPL,
        },
      });
      if (error) throw error;
      if (data?.analysis) {
        setAiResult(data.analysis);
      } else if (typeof data === "string") {
        setAiResult(data);
      } else {
        throw new Error("No analysis returned");
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleBudgetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0 && num <= 500000) setBudget(num);
    else if (raw === "") setBudget(0);
  };

  const cplAssessment = () => {
    if (areaCPL < 250) return { text: `تكلفة الليد في ${area.name} لـ ${propertyType} ممتازة — فرصة لزيادة الميزانية`, color: "#22c55e" };
    if (areaCPL <= 350) return { text: `تكلفة الليد في ${area.name} لـ ${propertyType} جيدة — أداء مقبول`, color: ACCENT };
    return { text: `تكلفة الليد في ${area.name} لـ ${propertyType} مرتفعة — ركز على الاستهداف`, color: "#f97316" };
  };

  const budgetAssessment = () => {
    if (budget < 20000) return { text: "الميزانية صغيرة — الإعلان محتاج 5-7 أيام عشان يتعلم. ابدأ بـ Ad Set واحد وركز على الاستهداف.", color: "#f97316" };
    if (budget <= 50000) return { text: "ميزانية كويسة — وزعها على 2-3 Ad Sets. ابدأ بـ 100-150 جنيه/يوم لكل واحد.", color: ACCENT };
    if (budget <= 100000) return { text: "ميزانية ممتازة — وزعها على 3-4 Ad Sets مع Retargeting campaign منفصلة.", color: "#3b82f6" };
    return { text: "ميزانية قوية — وزعها على 4-5 Ad Sets + Retargeting + Lookalike. خلي 20% للتجارب.", color: "#22c55e" };
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: "#0A0A0A", color: "#fff" }}>
      {/* ── Header ── */}
      <header className="border-b border-[#2A2A2A] px-6 sm:px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link to="/login" className="flex items-center gap-2.5">
          <img src={mwLogo} alt="MW Growth Systems" className="h-[50px] w-auto" />
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-white">
            حاسبة تكلفة الليد
          </h1>
          <p className="text-sm text-neutral-400">
            احسب تكلفة الليد وقارن بمتوسط السوق المصري
          </p>
        </div>

        {/* ── Input Section ── */}
        <section className="rounded-xl border border-[#2A2A2A] bg-[#161616] p-6 mb-6 space-y-6">
          {/* Field 1: Budget */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">
              الميزانية الشهرية (جنيه)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={budget > 0 ? fmt(budget) : ""}
              onChange={handleBudgetInput}
              className="w-full h-11 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 text-sm text-white text-right placeholder:text-neutral-600 focus:border-[#C8FF00]/60 focus:ring-1 focus:ring-[#C8FF00]/30 focus:outline-none transition-all mb-3"
              placeholder="50,000"
            />
            <div className="relative">
              <input
                type="range"
                min={5000}
                max={500000}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
                style={{
                  background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${((budget - 5000) / (500000 - 5000)) * 100}%, #262626 ${((budget - 5000) / (500000 - 5000)) * 100}%, #262626 100%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-neutral-600">500,000</span>
                <span className="text-[10px] text-neutral-600">5,000</span>
              </div>
            </div>
          </div>

          {/* Field 2: Area */}
          <Dropdown
            label="المنطقة"
            value={areaKey}
            onChange={setAreaKey}
            displayValue={area.name}
            options={Object.entries(AREA_BENCHMARKS).map(([key, val]) => ({ key, label: val.name }))}
          />

          {/* Field 3: Property Type */}
          <Dropdown
            label="نوع المنتج"
            value={propertyType}
            onChange={setPropertyType}
            displayValue={propertyType}
            options={PROPERTY_TYPES.map((t) => ({ key: t, label: t }))}
          />

          {/* Field 4: Platform (disabled) */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 text-right">المنصة</label>
            <div className="h-11 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 flex items-center justify-between opacity-70 cursor-not-allowed">
              <span className="text-[10px] text-neutral-500">حالياً متاح لـ Meta Ads فقط</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">Meta Ads</span>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#1877F2"/>
                  <path d="M15.5 8.5c-1.5 0-2 1.5-3.5 3.5s-2 3.5-3.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ── Calculate Button ── */}
        <button
          onClick={handleCalculate}
          className="w-full h-14 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 mb-10"
          style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}
        >
          <CalcIcon className="h-5 w-5" />
          احسب الآن
        </button>

        {/* ═══════════════ RESULTS ═══════════════ */}
        {showResults && (
          <div ref={resultsRef} key={resultsKey} className="space-y-8">

            {/* Results Card 1: CPL per property type comparison */}
            <div
              className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-6 animate-fade-in"
              style={{ borderRightWidth: "4px", borderRightColor: ACCENT, animationDelay: "0ms" }}
            >
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: ACCENT }} />
                تكلفة الليد في {area.name} حسب نوع المنتج
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-neutral-500 border-b border-[#2A2A2A]">
                      <th className="text-right py-2 px-3">نوع المنتج</th>
                      <th className="text-right py-2 px-3">CPL المتوقع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(area.types).map(([type, bench]) => {
                      const isSelected = type === propertyType;
                      return (
                        <tr
                          key={type}
                          className={`border-b border-[#2A2A2A]/50 transition-colors ${isSelected ? "bg-[#C8FF00]/5" : "hover:bg-white/5"}`}
                          style={isSelected ? { outline: `1px solid ${ACCENT}40`, borderRadius: 8 } : undefined}
                        >
                          <td className="py-3 px-3">
                            <span className={isSelected ? "text-[#C8FF00] font-bold" : "text-neutral-300"}>{type}</span>
                            {isSelected && <span className="text-[10px] text-[#C8FF00] mr-2">← اختيارك</span>}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`font-bold ${isSelected ? "text-[#C8FF00]" : "text-white"}`}>{fmt(bench.cpl)} جنيه</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Results Card 2: Expected Results - 3 cards */}
            <div>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
                <Target className="h-4 w-4" style={{ color: ACCENT }} />
                النتائج المتوقعة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Card A: Expected Leads */}
                <div className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-5 hover:border-[#C8FF00]/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: "150ms" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-neutral-500" />
                    <span className="text-xs text-neutral-500 font-medium">الليدز المتوقعة</span>
                  </div>
                  <p className="text-3xl font-bold text-white font-mono tracking-tight">
                    {fmt(animatedLeads)}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2">
                    بناءً على CPL {fmt(areaCPL)} جنيه
                  </p>
                </div>

                {/* Card B: Expected CPL */}
                <div className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-5 hover:border-[#C8FF00]/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: "250ms" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-neutral-500" />
                    <span className="text-xs text-neutral-500 font-medium">تكلفة الليد المتوقعة</span>
                  </div>
                  <p className="text-3xl font-bold font-mono tracking-tight" style={{ color: areaCPL < 250 ? "#22c55e" : areaCPL <= 350 ? ACCENT : "#f97316" }}>
                    {fmt(animatedCpl)} <span className="text-sm text-neutral-400">جنيه</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2">
                    {propertyType} في {area.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Results Card 3: Smart Diagnosis */}
            <div className="animate-fade-in" style={{ animationDelay: "400ms" }}>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <CalcIcon className="h-4 w-4" style={{ color: ACCENT }} />
                تشخيص ذكي
              </h3>
              <div className="space-y-3">
                {/* Diagnosis 1: CPL Assessment */}
                <DiagnosisCard borderColor={cplAssessment().color}>
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: cplAssessment().color }} />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">تقييم تكلفة الليد</p>
                      <p className="text-xs text-neutral-300 leading-relaxed">{cplAssessment().text}</p>
                    </div>
                  </div>
                </DiagnosisCard>

                {/* Diagnosis 2: CTR Recommendation */}
                <DiagnosisCard borderColor="#3b82f6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">توصيات الـ CTR</p>
                      <p className="text-xs text-neutral-300 leading-relaxed mb-1">
                        لو الـ CTR أقل من 2% على كل الحملات → مشكلة في الـ Creative
                      </p>
                      <p className="text-xs text-neutral-300 leading-relaxed mb-1">
                        لو الـ CTR عالي ({">"}3%) بس الليد غالي → مشكلة في الـ Audience
                      </p>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        الـ CTR الطبيعي: 1.5% - 3%
                      </p>
                    </div>
                  </div>
                </DiagnosisCard>

                {/* Diagnosis 3: Quality Recommendation */}
                <DiagnosisCard borderColor="#eab308">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-yellow-400" />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">جودة الليدز</p>
                      <p className="text-xs text-neutral-300 leading-relaxed mb-1">
                        نسبة الليدز الجاهزة (Quality): 25% - 35%
                      </p>
                      <p className="text-xs text-neutral-300 leading-relaxed mb-1">
                        لو أقل من 25% → الحملة محتاجة تحسين الاستهداف والمحتوى
                      </p>
                      <p className="text-xs text-red-400 leading-relaxed">
                        لو أقل من 15% → خطر — محتاج مراجعة عاجلة
                      </p>
                    </div>
                  </div>
                </DiagnosisCard>

                {/* Diagnosis 4: Budget Recommendation */}
                <DiagnosisCard borderColor={budgetAssessment().color}>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 mt-0.5 shrink-0" style={{ color: budgetAssessment().color }} />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">تقييم الميزانية</p>
                      <p className="text-xs text-neutral-300 leading-relaxed">{budgetAssessment().text}</p>
                    </div>
                  </div>
                </DiagnosisCard>
              </div>
            </div>

            {/* Results Card 4: Area Tips — Bigger, more prominent */}
            <div
              className="rounded-xl bg-gradient-to-l from-[#161616] to-[#1a1f10] border border-[#2A2A2A] p-8 animate-fade-in"
              style={{ borderRightWidth: "6px", borderRightColor: ACCENT, animationDelay: "500ms" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${ACCENT}15` }}>
                  <Lightbulb className="h-6 w-6" style={{ color: ACCENT }} />
                </div>
                <h3 className="text-lg font-bold text-white">
                  نصائح خبراء MW Growth Systems لـ {area.name}
                </h3>
              </div>
              <p className="text-sm text-neutral-300 leading-[1.9]">
                {area.tips}
              </p>
            </div>

            {/* AI Analysis Button + Result */}
            <div className="animate-fade-in" style={{ animationDelay: "550ms" }}>
              {!aiResult && !aiError && (
                <button
                  onClick={handleAiAnalysis}
                  disabled={aiLoading}
                  className="w-full h-12 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60"
                  style={{ borderColor: ACCENT, color: ACCENT, backgroundColor: "transparent" }}
                >
                  {aiLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحليل...</>
                  ) : (
                    <><Brain className="h-4 w-4" /> تحليل ذكي بالـ AI</>
                  )}
                </button>
              )}

              {aiResult && (
                <div
                  className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-6 mt-4"
                  style={{ borderTopWidth: "3px", borderTopColor: ACCENT }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5" style={{ color: ACCENT }} />
                    <h3 className="text-base font-bold text-white">تحليل AI Brain</h3>
                  </div>
                  <div className="text-sm text-neutral-300 leading-[1.9] whitespace-pre-line">
                    {aiResult}
                  </div>
                </div>
              )}

              {aiError && (
                <div className="rounded-xl bg-[#161616] border border-[#2A2A2A] p-5 mt-4 text-center">
                  <p className="text-sm text-neutral-400">التحليل الذكي غير متاح حالياً</p>
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="border-t border-[#2A2A2A] pt-10 text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
              <h3 className="text-lg font-bold text-white mb-2">
                عاوز تحليل كامل لحملاتك الحقيقية؟
              </h3>
              <p className="text-sm text-neutral-400 mb-6">
                منصة MW Growth Systems بتحلل حملاتك بالذكاء الاصطناعي وبتديك توصيات لحظية
              </p>
              <a href="https://wa.me/201034584067" target="_blank" rel="noopener noreferrer">
                <button
                  className="h-14 px-10 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] mx-auto flex items-center gap-3"
                  style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}
                >
                  احجز عرض مجاني
                </button>
              </a>
              <p className="text-xs text-neutral-500 mt-4">
                انضم لـ +50 شركة بتستخدم MW Growth Systems
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Custom slider styles ── */}
      <style>{`
        input[type="range"].accent-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 2px solid #0A0A0A;
          box-shadow: 0 0 8px ${ACCENT}40;
        }
        input[type="range"].accent-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 2px solid #0A0A0A;
          box-shadow: 0 0 8px ${ACCENT}40;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out both;
        }
      `}</style>
    </div>
  );
};

export default Calculator;
