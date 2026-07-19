import type { Task } from "@familieappen/shared";

export type TaskPayload = { title: string; description?: string | null; assignedFamilyMemberId?: string | null; assignedMemberIds?: string[]; dueDate?: string | null };
export type TaskViewModel = Task & { assigneeLabel: string; dueLabel: string | null };

export function getTaskAssignedMemberIds(task: Pick<Task, "assignedFamilyMemberId" | "assignedMemberIds">) {
  return task.assignedMemberIds ?? (task.assignedFamilyMemberId ? [task.assignedFamilyMemberId] : []);
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    if (first.completed !== second.completed) return first.completed ? 1 : -1;
    const firstDue = first.dueDate ? new Date(first.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const secondDue = second.dueDate ? new Date(second.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return firstDue - secondDue || new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
}

export function mapTaskToViewModel(task: Task, members: { id: string; displayName: string }[] = []): TaskViewModel {
  const memberIds = getTaskAssignedMemberIds(task);
  const names = memberIds.map((id) => members.find((member) => member.id === id)?.displayName).filter(Boolean) as string[];
  return {
    ...task,
    assigneeLabel: names.length === 0 ? "Alle" : names.length === 1 ? names[0] : `${names.length} personer`,
    dueLabel: task.dueDate ? task.dueDate.slice(0, 10) : null,
  };
}

export function replaceTask(current: Task[] | undefined, task: Task) {
  return current ? sortTasks(current.map((item) => (item.id === task.id ? task : item))) : current;
}
export function mergeCreatedTask(current: Task[] | undefined, task: Task) {
  return current ? sortTasks([...current.filter((item) => item.id !== task.id), task]) : current;
}
export function removeTask(current: Task[] | undefined, taskId: string) {
  return current ? current.filter((item) => item.id !== taskId) : current;
}
