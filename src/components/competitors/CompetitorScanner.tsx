import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radar, Loader2, Globe, Plus, ShieldAlert, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getThreatStyle } from "./competitorUtils";

interface ScanResult {
  found: boolean;
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  social_links?: Record<string, string | null>;
  estimated_size?: string;
  key_services?: string[];
  initial_assessment?: string;
  threat_level?: string;
  strengths?: string[];
  weaknesses?: string[];
  raw?: string;
}

export function CompetitorScanner() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("مصر");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleScan = async () => {
    if (!query.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-search", {
        body: { query: query.trim(), country },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setScanning(false); return; }
      const res = data?.result;
      if (res?.found === false && !res.name) {
        toast.error("لم يتم العثور على الشركة");
        setResult(null);
      } else {
        setResult(res);
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    }
    setScanning(false);
  };

  const handleAddToWarRoom = async () => {
    if (!orgId || !result?.name) return;
    setSaving(true);
    try {
      const { data: comp, error: compError } = await supabase.from("competitors").insert({
        org_id: orgId,
        name: result.name,
        website: result.website || null,
        industry: result.industry || null,
        description: result.description || null,
        threat_level: result.threat_level || "medium",
      }).select().single();

      if (compError) throw compError;

      // Insert initial intel entries
      const intelEntries: any[] = [];
      if (result.strengths?.length) {
        result.strengths.forEach(s => {
          intelEntries.push({
            org_id: orgId, competitor_id: comp.id, intel_type: "custom",
            title: `نقطة قوة: ${s}`, source: "ai_scan",
          });
        });
      }
      if (result.weaknesses?.length) {
        result.weaknesses.forEach(w => {
          intelEntries.push({
            org_id: orgId, competitor_id: comp.id, intel_type: "custom",
            title: `نقطة ضعف: ${w}`, source: "ai_scan",
          });
        });
      }
      if (result.initial_assessment) {
        intelEntries.push({
          org_id: orgId, competitor_id: comp.id, intel_type: "custom",
          title: result.initial_assessment, source: "ai_scan",
        });
      }
      if (intelEntries.length > 0) {
        await supabase.from("competitor_intel").insert(intelEntries);
      }

      toast.success(`${result.name} added to War Room`);
      queryClient.invalidateQueries({ queryKey: ["competitors"] });
      queryClient.invalidateQueries({ queryKey: ["competitor_intel"] });
      setResult(null);
      setQuery("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add competitor");
    }
    setSaving(false);
  };

  const threatStyle = result?.threat_level ? getThreatStyle(result.threat_level) : null;

  const socialIcons: Record<string, string> = { facebook: "FB", instagram: "IG", linkedin: "LI", twitter: "X" };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="glass-card border border-primary/20 rounded-xl p-5 section-glow">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Competitor Scanner</h3>
          <span className="text-[10px] text-muted-foreground">AI-powered search</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input value={query} onChange={e => setQuery(e.target.value)} dir="rtl"
              placeholder="ابحث عن منافس... (اكتب اسم الشركة)"
              onKeyDown={e => e.key === "Enter" && handleScan()}
              className="w-full h-11 bg-secondary border border-border rounded-xl px-4 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
          </div>
          <select value={country} onChange={e => setCountry(e.target.value)}
            className="h-11 bg-secondary border border-border rounded-xl px-3 text-xs text-foreground">
            <option value="مصر">مصر</option>
            <option value="السعودية">السعودية</option>
            <option value="الإمارات">الإمارات</option>
            <option value="الأردن">الأردن</option>
            <option value="Global">Global</option>
          </select>
          <Button onClick={handleScan} disabled={scanning || !query.trim()} className="h-11 px-5 gap-2">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            Scan
          </Button>
        </div>
      </div>

      {/* Scanning animation */}
      {scanning && (
        <div className="glass-card border border-primary/20 rounded-xl p-8 text-center animate-fade-in-up">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/50 border-t-transparent radar-sweep" />
            <Radar className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-foreground" dir="rtl">جاري البحث عن "{query}"...</p>
          <p className="text-[10px] text-muted-foreground mt-1">Scanning competitive landscape</p>
        </div>
      )}

      {/* Result preview */}
      {result && !scanning && (
        <div className="glass-card border border-primary/30 rounded-xl p-6 animate-fade-in-up section-glow">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold text-primary ring-1 ring-primary/20">
                {(result.name || "?")[0]}
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">{result.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {result.industry && <span className="text-[10px] text-muted-foreground">{result.industry}</span>}
                  {result.estimated_size && (
                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{result.estimated_size}</span>
                  )}
                </div>
              </div>
            </div>
            {threatStyle && (
              <span className={cn("text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border", threatStyle.bg, threatStyle.color)}>
                <ShieldAlert className="h-3 w-3 inline mr-1" />
                {threatStyle.label.toUpperCase()}
              </span>
            )}
          </div>

          {/* Description */}
          {result.description && (
            <p className="text-sm text-foreground/80 mb-4" dir="rtl">{result.description}</p>
          )}

          {/* Links */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {result.website && (
              <a href={result.website} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                <Globe className="h-3 w-3" /> {result.website}
              </a>
            )}
            {result.social_links && Object.entries(result.social_links).filter(([, v]) => v).map(([key, url]) => (
              <a key={key} href={url!} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded-lg border border-border/50">
                {socialIcons[key] || key}
              </a>
            ))}
          </div>

          {/* Services */}
          {result.key_services && result.key_services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {result.key_services.map((s, i) => (
                <span key={i} className="text-[10px] bg-secondary/80 text-foreground px-2 py-1 rounded-lg border border-border/30">{s}</span>
              ))}
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-green-400 mb-2 font-mono">STRENGTHS</p>
                {result.strengths.map((s, i) => (
                  <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5 mb-1">
                    <Check className="h-3 w-3 text-green-400 shrink-0 mt-0.5" /> {s}
                  </p>
                ))}
              </div>
            )}
            {result.weaknesses && result.weaknesses.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-red-400 mb-2 font-mono">WEAKNESSES</p>
                {result.weaknesses.map((w, i) => (
                  <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5 mb-1">
                    <X className="h-3 w-3 text-red-400 shrink-0 mt-0.5" /> {w}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Assessment */}
          {result.initial_assessment && (
            <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 mb-4" dir="rtl">{result.initial_assessment}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleAddToWarRoom} disabled={saving} className="gap-2 flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to War Room
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)} className="gap-1.5">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
