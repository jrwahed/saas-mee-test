export const TASK_STATUSES = [
  { id: "pending", label: "Pending", dotColor: "bg-gray-400", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  { id: "assigned", label: "Assigned", dotColor: "bg-blue-400", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "in_progress", label: "In Progress", dotColor: "bg-yellow-400", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { id: "review", label: "Review", dotColor: "bg-purple-400", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "completed", label: "Completed", dotColor: "bg-green-400", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { id: "blocked", label: "Blocked", dotColor: "bg-red-400", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { id: "cancelled", label: "Cancelled", dotColor: "bg-gray-600", color: "bg-gray-600/10 text-gray-500 border-gray-600/20" },
] as const;

export const KANBAN_COLUMNS = TASK_STATUSES.filter(s => !["cancelled"].includes(s.id));

export const PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-500/15 text-red-400 border border-red-500/20" },
  high: { label: "High", color: "bg-orange-500/15 text-orange-400 border border-orange-500/20" },
  medium: { label: "Medium", color: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  low: { label: "Low", color: "bg-gray-500/15 text-gray-400 border border-gray-500/20" },
};

export const TASK_CATEGORIES = [
  "marketing", "sales", "design", "content", "technical", "admin",
] as const;

export const CATEGORY_STYLES: Record<string, string> = {
  marketing: "bg-purple-500/10 text-purple-400",
  sales: "bg-green-500/10 text-green-400",
  design: "bg-pink-500/10 text-pink-400",
  content: "bg-blue-500/10 text-blue-400",
  technical: "bg-orange-500/10 text-orange-400",
  admin: "bg-gray-500/10 text-gray-400",
};

export const MOOD_OPTIONS = [
  { value: "productive", label: "Productive", emoji: "🚀" },
  { value: "normal", label: "Normal", emoji: "😊" },
  { value: "struggling", label: "Struggling", emoji: "😓" },
  { value: "blocked", label: "Blocked", emoji: "🚫" },
] as const;

export function getStatusInfo(status: string) {
  return TASK_STATUSES.find(s => s.id === status) || TASK_STATUSES[0];
}

export function getPriorityInfo(priority: string) {
  return PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
