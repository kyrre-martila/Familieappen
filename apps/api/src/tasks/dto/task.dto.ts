export interface CreateTaskRequestDto {
  title?: unknown;
  description?: unknown;
  assignedFamilyMemberId?: unknown;
  dueDate?: unknown;
}

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
