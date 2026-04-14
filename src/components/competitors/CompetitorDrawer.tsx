import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Globe, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitorIntel } from "@/hooks/useCompetitorData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getIntelType, timeAgo, formatChange, INTEL_TYPES } from "./competitorUtils";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  competitor: Tables<"competitors"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompetitorDrawer({ competitor, open, onOpenChange }: Props) {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const { data: intel = [] } = useCompetitorIntel(competitor?.id);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add intel form
  const [addingIntel, setAddingIntel] = useState(false);
  const [intelType, setIntelType] = useState("custom");
  const [intelTitle, setIntelTitle] = useState("");
  const [intelValue, setIntelValue] = useState("");

  useEffect(() => {
    if (competitor && open) {
      setName(competitor.name); setWebsite(competitor.website || "");
      setIndustry(competitor.industry || ""); setDescription(competitor.description || "");
      setAiAnalysis("");
    }
  }, [competitor?.id, open]);

  const handleSave = async () => {
    if (!competitor || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("competitors").update({
      name, website: website || null, industry: industry || null, description: description || null,
      updated_at: new Date().toISOString(),
    }).eq("id", competitor.id);
    if (error) toast.error("Error saving"); else { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: ["competitors"] }); }
    setSaving(false);
  };

  const handleAddIntel = async () => {
    if (!competitor || !orgId || !intelTitle.trim()) return;
    const { error } = await supabase.from("competitor_intel").insert({
      org_id: orgId, competitor_id: competitor.id, intel_type: intelType,
      title: intelTitle.trim(), value: intelValue ? Number(intelValue) : null, source: "manual",
    });
    if (error) toast.error("Error adding intel");
    else {
      toast.success("Intel added"); setAddingIntel(false); setIntelTitle(""); setIntelValue("");
      queryClient.invalidateQueries({ queryKey: ["competitor_intel"] });
    }
  };

  const handleAiAnalyze = async () => {
    if (!competitor) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-ai-analyze", {
        body: { type: "threat_assessment", data: { competitor, intel: intel.slice(0, 20) } },
      });
      if (error) throw error;
      setAiAnalysis(data?.report || "No analysis available");
      toast.success("Analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    }
    setAiLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">{competitor?.name || "Competitor"}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="profile" className="flex-1 text-xs">Profile</TabsTrigger>
            <TabsTrigger value="intel" className="flex-1 text-xs">Intel</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 text-xs">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
              <div className="flex gap-2">
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."
                  className="flex-1 h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 flex items-center justify-center bg-secondary border border-border rounded-lg hover:bg-secondary/80">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Industry</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full h-9 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          <TabsContent value="intel" className="space-y-4 mt-4">
            <Button size="sm" variant="outline" onClick={() => setAddingIntel(!addingIntel)} className="w-full gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Intel Manually
            </Button>
            {addingIntel && (
              <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-3">
                <select value={intelType} onChange={e => setIntelType(e.target.value)}
                  className="w-full h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground">
                  {Object.entries(INTEL_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
                <input value={intelTitle} onChange={e => setIntelTitle(e.target.value)} placeholder="What happened?"
                  className="w-full h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground" />
                <input value={intelValue} onChange={e => setIntelValue(e.target.value)} placeholder="Value (optional)" type="number"
                  className="w-full h-8 bg-secondary border border-border rounded-lg px-2 text-xs text-foreground" />
                <Button size="sm" onClick={handleAddIntel} disabled={!intelTitle.trim()} className="text-xs">Save Intel</Button>
              </div>
            )}
            <div className="space-y-2">
              {intel.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No intel data yet</p>}
              {intel.map(item => {
                const type = getIntelType(item.intel_type);
                const change = formatChange(item.value, item.previous_value);
                return (
                  <div key={item.id} className="border-l-2 border-border pl-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{type.icon}</span>
                      <span className={cn("text-xs font-medium", type.color)}>{type.label}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(item.captured_at)}</span>
                    </div>
                    <p className="text-xs text-foreground">{item.title}</p>
                    {item.value != null && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-foreground">{Number(item.value).toLocaleString()} {item.unit || ""}</span>
                        {change && <span className={cn("text-[10px] font-mono", change.positive ? "text-green-400" : "text-red-400")}>{change.text}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {aiAnalysis ? (
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" dir="rtl">{aiAnalysis}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Run AI threat assessment</p>
              </div>
            )}
            <Button onClick={handleAiAnalyze} disabled={aiLoading} className="w-full gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {aiLoading ? "Analyzing..." : "Threat Assessment"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
