import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import SkyBrain from "./pages/SkyBrain";
import AIPerformance from "./pages/AIPerformance";
import Campaigns from "./pages/Campaigns";
import CRM from "./pages/CRM";
import Sales from "./pages/Sales";
import SalesPipeline from "./pages/SalesPipeline";
import Reports from "./pages/Reports";
import Tasks from "./pages/Tasks";
import Competitors from "./pages/Competitors";
import LeadEngine from "./pages/LeadEngine";
import Login from "./pages/Login";
import Calculator from "./pages/Calculator";
import UserManagement from "./pages/UserManagement";
import AdminOnboard from "./pages/AdminOnboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClientProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/calculator" element={<Calculator />} />
              
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/ai-brain" element={<ProtectedRoute><SkyBrain /></ProtectedRoute>} />
              <Route path="/ai-performance-marketing" element={<ProtectedRoute><AIPerformance /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/sales-pipeline" element={<ProtectedRoute><SalesPipeline /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/competitors" element={<ProtectedRoute><Competitors /></ProtectedRoute>} />
              <Route path="/lead-engine" element={<ProtectedRoute><LeadEngine /></ProtectedRoute>} />
              <Route path="/admin-onboard" element={<ProtectedRoute><AdminOnboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
