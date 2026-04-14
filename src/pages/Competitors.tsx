import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitors, useCompetitorIntel, useCompetitorReports, useMarketBenchmarks } from "@/hooks/useCompetitorData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ThreatRadar } from "@/components/competitors/ThreatRadar";
import { CompetitorCard } from "@/components/competitors/CompetitorCard";
import { CompetitorDrawer } from "@/components/competitors/CompetitorDrawer";
import { CompetitorScanner } from "@/components/competitors/CompetitorScanner";
import { IntelFeed } from "@/components/competitors/IntelFeed";
import { BattleStation } from "@/components/competitors/BattleStation";
import { MarketPosition } from "@/components/competitors/MarketPosition";
import { CompetitorCompare } from "@/components/competitors/CompetitorCompare";
import type { Tables } from "@/integrations/supabase/types";

const Competitors = () => {
  const { orgId } = useAuth();
  const { data: competitors = [], isLoading } = useCompetitors();
  const { data: allIntel = [] } = useCompetitorIntel();
  const { data: reports = [] } = useCompetitorReports();
  const { data: benchmarks = [] } = useMarketBenchmarks();
  useRealtimeSubscription("competitors", ["competitors"], "competitors-rt");
  useRealtimeSubscription("competitor_intel", ["competitor_intel"], "intel-rt");

  const [selectedCompetitor, setSelectedCompetitor] = useState<Tables<"competitors"> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCompetitorClick = (c: Tables<"competitors">) => {
    setSelectedCompetitor(c);
    setDrawerOpen(true);
  };

  const getLatestIntel = (competitorId: string) =>
    allIntel.filter(i => i.competitor_id === competitorId).slice(0, 10);

  return (
    <DashboardLayout title="Competitive Intelligence" subtitle="Track competitors, gather intel & generate battle plans">
      <div className="page-fade-in space-y-6">
        {/* Threat Radar — always visible at top */}
        {!isLoading && competitors.length > 0 && (
          <ThreatRadar competitors={competitors} intel={allIntel} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="war-room" className="w-full">
          <TabsList className="bg-secondary/80 backdrop-blur-sm">
            <TabsTrigger value="war-room" className="text-xs font-mono">War Room</TabsTrigger>
            <TabsTrigger value="intel-feed" className="text-xs font-mono">Intel Feed</TabsTrigger>
            <TabsTrigger value="battle-station" className="text-xs font-mono">Battle Station</TabsTrigger>
            <TabsTrigger value="market-position" className="text-xs font-mono">Market Position</TabsTrigger>
            <TabsTrigger value="compare" className="text-xs font-mono">Compare</TabsTrigger>
          </TabsList>

          {/* War Room */}
          <TabsContent value="war-room" className="mt-6 space-y-6">
            {/* Scanner */}
            <CompetitorScanner />

            {/* Competitor Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
              </div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-16">
                <Radar className="h-12 w-12 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No competitors tracked yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Use the scanner above to find and add competitors.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                {competitors.map(c => (
                  <CompetitorCard key={c.id} competitor={c} latestIntel={getLatestIntel(c.id)} onClick={() => handleCompetitorClick(c)} />
                ))}
              </div>
            )}

            {/* Compact intel feed in war room */}
            {allIntel.length > 0 && (
              <IntelFeed intel={allIntel} competitors={competitors} compact />
            )}
          </TabsContent>

          {/* Intel Feed */}
          <TabsContent value="intel-feed" className="mt-6">
            <IntelFeed intel={allIntel} competitors={competitors} />
          </TabsContent>

          {/* Battle Station */}
          <TabsContent value="battle-station" className="mt-6">
            <BattleStation competitors={competitors} intel={allIntel} reports={reports} />
          </TabsContent>

          {/* Market Position */}
          <TabsContent value="market-position" className="mt-6">
            <MarketPosition competitors={competitors} intel={allIntel} benchmarks={benchmarks} />
          </TabsContent>

          {/* Compare */}
          <TabsContent value="compare" className="mt-6">
            <CompetitorCompare competitors={competitors} intel={allIntel} />
          </TabsContent>
        </Tabs>

        <CompetitorDrawer competitor={selectedCompetitor} open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </DashboardLayout>
  );
};

export default Competitors;
