// Role-based access control configuration

export type AppRole = "super_admin" | "owner" | "sales_manager" | "marketing_manager" | "team_leader" | "sales_rep" | "viewer";

export interface UserPermissions {
  page_access: string[];
  crm_see_all: boolean;
  crm_can_assign: boolean;
  crm_can_delete: boolean;
  crm_can_add: boolean;
  crm_see_all_comments: boolean;
  is_custom: boolean;
}

// Default page access per role (using route paths)
export const DEFAULT_ACCESS: Record<AppRole, string[]> = {
  super_admin: ["/", "/ai-brain", "/ai-performance-marketing", "/campaigns", "/crm", "/tasks", "/sales", "/sales-pipeline", "/reports", "/competitors", "/users", "/admin-onboard", "/lead-engine"],
  owner: ["/", "/ai-brain", "/ai-performance-marketing", "/campaigns", "/crm", "/tasks", "/sales", "/sales-pipeline", "/reports", "/competitors", "/users", "/lead-engine"],
  sales_manager: ["/", "/ai-brain", "/crm", "/tasks", "/sales", "/sales-pipeline", "/reports", "/lead-engine"],
  marketing_manager: ["/", "/ai-brain", "/ai-performance-marketing", "/campaigns", "/tasks", "/reports", "/competitors", "/lead-engine"],
  team_leader: ["/", "/crm", "/tasks", "/sales", "/reports", "/lead-engine"],
  sales_rep: ["/crm", "/tasks"],
  viewer: ["/"],
};

// Default CRM permissions per role
export const DEFAULT_CRM_PERMS: Record<AppRole, Omit<UserPermissions, "page_access" | "is_custom">> = {
  super_admin: { crm_see_all: true, crm_can_assign: true, crm_can_delete: true, crm_can_add: true, crm_see_all_comments: true },
  owner: { crm_see_all: true, crm_can_assign: true, crm_can_delete: true, crm_can_add: true, crm_see_all_comments: true },
  sales_manager: { crm_see_all: true, crm_can_assign: true, crm_can_delete: true, crm_can_add: true, crm_see_all_comments: true },
  marketing_manager: { crm_see_all: false, crm_can_assign: false, crm_can_delete: false, crm_can_add: false, crm_see_all_comments: false },
  team_leader: { crm_see_all: true, crm_can_assign: false, crm_can_delete: false, crm_can_add: false, crm_see_all_comments: true },
  sales_rep: { crm_see_all: false, crm_can_assign: false, crm_can_delete: false, crm_can_add: false, crm_see_all_comments: false },
  viewer: { crm_see_all: false, crm_can_assign: false, crm_can_delete: false, crm_can_add: false, crm_see_all_comments: false },
};

// All pages for the permissions modal
export const ALL_PAGES = [
  { path: "/", label: "Dashboard" },
  { path: "/ai-brain", label: "AI Growth Brain" },
  { path: "/ai-performance-marketing", label: "AI Performance" },
  { path: "/campaigns", label: "Campaigns" },
  { path: "/crm", label: "CRM" },
  { path: "/sales", label: "Sales" },
  { path: "/sales-pipeline", label: "Sales Pipeline" },
  { path: "/tasks", label: "Tasks" },
  { path: "/reports", label: "Reports" },
  { path: "/competitors", label: "Intelligence" },
];

// Super admin email(s)
export const SUPER_ADMIN_EMAIL = "jrwaheed00@gmail.com";

// Default landing page after login
export const ROLE_DEFAULT_PAGE: Record<AppRole, string> = {
  super_admin: "/",
  owner: "/",
  sales_manager: "/",
  marketing_manager: "/",
  team_leader: "/",
  sales_rep: "/crm",
  viewer: "/",
};

export function getEffectivePermissions(role: string | null, customPerms?: UserPermissions | null): UserPermissions {
  const r = (role || "viewer") as AppRole;
  if (customPerms?.is_custom) {
    return customPerms;
  }
  return {
    page_access: DEFAULT_ACCESS[r] || DEFAULT_ACCESS.viewer,
    is_custom: false,
    ...(DEFAULT_CRM_PERMS[r] || DEFAULT_CRM_PERMS.viewer),
  };
}

export function canAccessPage(role: string | null, path: string, customPerms?: UserPermissions | null): boolean {
  const perms = getEffectivePermissions(role, customPerms);
  return perms.page_access.includes(path);
}

export function getDefaultPage(role: string | null): string {
  if (!role) return "/crm";
  return ROLE_DEFAULT_PAGE[role as AppRole] || "/crm";
}

// Role display info
export const ROLE_LABELS: Record<string, { label: string; labelAr: string; color: string; desc: string }> = {
  super_admin: { label: "Admin", labelAr: "مسؤول النظام", color: "bg-destructive/15 text-destructive border-destructive/30", desc: "صلاحيات كاملة لكل المنظمات" },
  owner: { label: "Owner", labelAr: "صاحب الشركة", color: "bg-primary/15 text-primary border-primary/30", desc: "صلاحيات كاملة" },
  sales_manager: { label: "Sales Manager", labelAr: "مدير المبيعات", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", desc: "إدارة فريق المبيعات والليدز" },
  marketing_manager: { label: "Marketing", labelAr: "مدير التسويق", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", desc: "إدارة الحملات والتسويق" },
  team_leader: { label: "Team Leader", labelAr: "تيم ليدر", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", desc: "مشاهدة أداء الفريق والليدز" },
  sales_rep: { label: "Sales", labelAr: "سيلز", color: "bg-green-500/15 text-green-400 border-green-500/30", desc: "التعامل مع الليدز المعينة فقط" },
  viewer: { label: "عرض فقط", labelAr: "مشاهد", color: "bg-muted text-muted-foreground border-border", desc: "عرض الداشبورد فقط — بدون أي تعديل" },
};
