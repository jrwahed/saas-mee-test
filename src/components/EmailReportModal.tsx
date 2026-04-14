import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EmailReportModal() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [to, setTo] = useState("admin@mwgrowth.com");
  const [subject, setSubject] = useState("MW Growth Systems Weekly Report — Week of March 1-7");
  const [period, setPeriod] = useState("this-week");
  const [note, setNote] = useState("");
  const [sections, setSections] = useState({
    kpi: true,
    campaign: true,
    pipeline: true,
    ai: true,
    raw: false,
  });

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setTimeout(() => setSent(false), 300);
    }, 2000);
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Mail className="h-3.5 w-3.5" />
          Email Report
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        {sent ? (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Report sent!</h3>
            <p className="text-sm text-muted-foreground">Report sent successfully</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Send Report via Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-10 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Report Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-secondary border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Include Sections</label>
                <div className="space-y-2">
                  {[
                    { key: "kpi" as const, label: "KPI Summary" },
                    { key: "campaign" as const, label: "Campaign Performance" },
                    { key: "pipeline" as const, label: "Lead Pipeline" },
                    { key: "ai" as const, label: "AI Insights" },
                    { key: "raw" as const, label: "Raw Data Tables" },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={sections[s.key]}
                        onCheckedChange={() => toggleSection(s.key)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label className="text-xs text-foreground">{s.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Personal note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
              <Button onClick={handleSend} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Send Report
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Report will be sent as PDF attachment</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
