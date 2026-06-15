export interface TaskMutationRequestDto {
  title?: unknown;
  description?: unknown;
  assignedFamilyMemberId?: unknown;
  dueDate?: unknown;
}

export type CreateTaskRequestDto = TaskMutationRequestDto;
export type UpdateTaskRequestDto = TaskMutationRequestDto;

export interface TaskDto {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  assignedFamilyMemberId: string | null;
  createdByUserId: string | null;
  completed: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
