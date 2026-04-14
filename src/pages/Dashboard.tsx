import { DashboardLayout } from "@/components/DashboardLayout";
import { PremiumKPICards } from "@/components/PremiumKPICards";
import { SpendChart, LeadsChart } from "@/components/DashboardCharts";
import { SkyBrainTeaser } from "@/components/SkyBrainTeaser";
import { PageAIBanner } from "@/components/PageAIBanner";
import { ErrorState } from "@/components/ErrorState";
import { useDashboardKPIs } from "@/hooks/useDashboardData";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Rocket } from "lucide-react";

const Dashboard = () => {
  const {
    totalSpend, totalLeads, cpl, conversionRate,
    dealsClosed, revenue,
    spendChartData, leadsChartData, isLoading, error, refetch,
  } = useDashboardKPIs();

  useRealtimeSubscription("campaigns_data", ["campaigns_data"], "dashboard-campaigns-rt");
  useRealtimeSubscription("leads", ["leads"], "dashboard-leads-rt");

  const hasData = totalLeads > 0 || totalSpend > 0;
  const hasChartData = spendChartData.length > 0 || leadsChartData.length > 0;

  return (
    <DashboardLayout title="Dashboard" subtitle="Campaign performance overview">
      <div className="page-fade-in">
        <PageAIBanner page="dashboard" />

        {error ? (
          <ErrorState message="حدث خطأ أثناء تحميل بيانات الداشبورد" onRetry={refetch} />
        ) : (
          <div className="space-y-8">
            <PremiumKPICards
              totalSpend={totalSpend}
              totalLeads={totalLeads}
              cpl={cpl}
              conversionRate={conversionRate}
              dealsClosed={dealsClosed}
              revenue={revenue}
              isLoading={isLoading}
            />

            <SkyBrainTeaser />

            {!isLoading && hasChartData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendChart data={spendChartData} isLoading={isLoading} />
                <LeadsChart data={leadsChartData} isLoading={isLoading} />
              </div>
            ) : !isLoading && !hasData ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center animate-fade-in-up card-glow">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-foreground font-semibold mb-1" dir="rtl">ابدأ حملتك الأولى</p>
                <p className="text-sm text-muted-foreground" dir="rtl">البيانات ستظهر هنا عند بدء الحملات</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendChart data={spendChartData} isLoading={isLoading} />
                <LeadsChart data={leadsChartData} isLoading={isLoading} />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
