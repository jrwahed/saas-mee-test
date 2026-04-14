import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in-up">
      <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        <AlertTriangle className="h-10 w-10 text-destructive/60 status-dot-pulse" />
      </div>
      <p className="text-sm text-foreground font-medium" dir="rtl">
        {message || "حدث خطأ أثناء تحميل البيانات"}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span dir="rtl">إعادة المحاولة</span>
        </Button>
      )}
    </div>
  );
}
