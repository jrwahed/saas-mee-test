import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Rule = Tables<"task_assignment_rules">;

/**
 * Auto-assignment algorithm: Round-robin with load balancing
 * 1. Get all active assignment rules for the org
 * 2. Filter to members who handle the task's category
 * 3. Sort by: (current_task_count / max_concurrent_tasks) ASC, then skill_level DESC
 * 4. Assign to the least loaded, most skilled available member
 */
export function findBestAssignee(
  task: Pick<Task, "category">,
  rules: Rule[],
  currentTasks: Task[]
): string | null {
  const activeRules = rules.filter(r => r.is_active);
  if (activeRules.length === 0) return null;

  // Filter by category if task has one
  const candidates = task.category
    ? activeRules.filter(r => r.categories?.includes(task.category!))
    : activeRules;

  if (candidates.length === 0) return null;

  // Count current active tasks per person
  const activeTasks = currentTasks.filter(t =>
    t.status && !["completed", "cancelled"].includes(t.status)
  );

  const taskCounts: Record<string, number> = {};
  activeTasks.forEach(t => {
    if (t.assigned_to) {
      taskCounts[t.assigned_to] = (taskCounts[t.assigned_to] || 0) + 1;
    }
  });

  // Score each candidate: lower load ratio = better, higher skill = better
  const scored = candidates.map(r => {
    const currentCount = taskCounts[r.user_email] || 0;
    const maxTasks = r.max_concurrent_tasks || 5;
    const loadRatio = currentCount / maxTasks;
    const skill = r.skill_level || 3;
    return { email: r.user_email, loadRatio, skill, overloaded: currentCount >= maxTasks };
  });

  // Filter out overloaded members
  const available = scored.filter(s => !s.overloaded);
  if (available.length === 0) return null;

  // Sort: lowest load first, then highest skill
  available.sort((a, b) => {
    if (a.loadRatio !== b.loadRatio) return a.loadRatio - b.loadRatio;
    return b.skill - a.skill;
  });

  return available[0].email;
}
