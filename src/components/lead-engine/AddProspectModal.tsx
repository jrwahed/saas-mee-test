import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateProspect } from "@/hooks/useLeadEngine";
import { Brain } from "lucide-react";

interface AddProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze?: (prospectId: string) => void;
}

const SECTORS = [
  { value: "fmcg", label: "FMCG (سلع استهلاكية)" },
  { value: "telecom", label: "اتصالات" },
  { value: "banking", label: "بنوك" },
  { value: "real_estate", label: "عقارات" },
  { value: "auto", label: "سيارات" },
  { value: "education", label: "تعليم" },
  { value: "other", label: "أخرى" },
];

const SIZES = [
  { value: "small", label: "صغيرة (<50 موظف)" },
  { value: "medium", label: "متوسطة (50-200 موظف)" },
  { value: "large", label: "كبيرة (>200 موظف)" },
];

export function AddProspectModal({ open, onOpenChange, onAnalyze }: AddProspectModalProps) {
  const createProspect = useCreateProspect();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sector: "",
    size: "",
    website: "",
    marketing_activity: "",
    reason_for_selection: "",
  });

  const handleSubmit = async (withAnalysis = false) => {
    if (!formData.name || !formData.sector) {
      toast.error("اسم الشركة والقطاع مطلوبان");
      return;
    }

    setLoading(true);
    try {
      const prospect = await createProspect.mutateAsync({
        name: formData.name,
        sector: formData.sector,
        size: formData.size || null,
        website: formData.website || null,
        social_links: {},
        marketing_activity: formData.marketing_activity || null,
        reason_for_selection: formData.reason_for_selection || null,
        ai_priority_score: 0,
        status: "prospect",
      });

      toast.success("تم إضافة الشركة بنجاح");
      
      if (withAnalysis && onAnalyze) {
        setAnalyzing(false);
        onAnalyze(prospect.id);
        onOpenChange(false);
        resetForm();
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الإضافة");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sector: "",
      size: "",
      website: "",
      marketing_activity: "",
      reason_for_selection: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة شركة مستهدفة جديدة</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* اسم الشركة */}
          <div className="grid gap-2">
            <Label htmlFor="name">اسم الشركة *</Label>
            <Input
              id="name"
              placeholder="مثال: شركة النيل للأغذية"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* القطاع */}
          <div className="grid gap-2">
            <Label htmlFor="sector">القطاع *</Label>
            <Select
              value={formData.sector}
              onValueChange={(value) => setFormData({ ...formData, sector: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر القطاع" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* حجم الشركة */}
          <div className="grid gap-2">
            <Label htmlFor="size">حجم الشركة</Label>
            <Select
              value={formData.size}
              onValueChange={(value) => setFormData({ ...formData, size: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحجم" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الموقع الإلكتروني */}
          <div className="grid gap-2">
            <Label htmlFor="website">الموقع الإلكتروني</Label>
            <Input
              id="website"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>

          {/* النشاط التسويقي */}
          <div className="grid gap-2">
            <Label htmlFor="marketing_activity">النشاط التسويقي الحالي</Label>
            <Textarea
              id="marketing_activity"
              placeholder="إيه اللي بيعملوه دلوقتي في التسويق؟"
              rows={3}
              value={formData.marketing_activity}
              onChange={(e) => setFormData({ ...formData, marketing_activity: e.target.value })}
            />
          </div>

          {/* سبب الاختيار */}
          <div className="grid gap-2">
            <Label htmlFor="reason">سبب الاختيار</Label>
            <Textarea
              id="reason"
              placeholder="ليه اخترنا الشركة دي بالتحديد؟"
              rows={3}
              value={formData.reason_for_selection}
              onChange={(e) => setFormData({ ...formData, reason_for_selection: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || analyzing}
          >
            إلغاء
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading || analyzing}
          >
            حفظ
          </Button>
          <Button
            onClick={() => {
              setAnalyzing(true);
              handleSubmit(true);
            }}
            disabled={loading || analyzing}
            className="bg-primary hover:bg-primary/90"
          >
            {analyzing ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                حفظ وتحليل بالـ AI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
