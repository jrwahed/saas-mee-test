import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Menu, X } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <div className={`
        fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="lg:ml-[240px] flex flex-col min-h-screen">
        <AppHeader
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 page-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
