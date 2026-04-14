export const STATUS_STYLES: Record<string, string> = {
  'Fresh': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'Qualified': 'bg-lime-500/10 text-lime-400 border border-lime-500/20',
  'Meeting / Visit Scheduled': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'Follow-up / Re-call': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'Reserved / Under Contract': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'Sold / Closed Won': 'bg-green-500/10 text-green-400 border border-green-500/20',
  'Not Interested': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'No Answer': 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  'Low Budget': 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  'Postponed / Future Interest': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'Unreachable': 'bg-red-700/10 text-red-500 border border-red-700/20',
  'Wrong Number / Inquiries': 'bg-amber-800/10 text-amber-500 border border-amber-800/20',
  'Junk / Trash': 'bg-gray-700/10 text-gray-500 border border-gray-700/20',
};

export function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
}

export const STATUS_BADGE_BASE = 'rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center';
