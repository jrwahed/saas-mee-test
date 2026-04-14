import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight } from "lucide-react";

export function SkyBrainTeaser() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/ai-brain")}
      className="group cursor-pointer rounded-xl border border-primary/20 bg-card p-4 flex items-center gap-4 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(82_85%_55%/0.1)] animate-fade-in-up"
      style={{ animation: "borderPulse 3s ease-in-out infinite" }}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Brain className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0" dir="rtl">
        <p className="text-sm font-semibold text-foreground">AI Growth Brain</p>
        <p className="text-xs text-muted-foreground">3 توصيات جديدة من مركز الذكاء &larr;</p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <style>{`
        @keyframes borderPulse {
          0%, 100% { border-color: hsl(271 81% 56% / 0.2); }
          50% { border-color: hsl(271 81% 56% / 0.4); }
        }
      `}</style>
    </div>
  );
}
