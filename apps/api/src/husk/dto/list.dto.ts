import { FamilyMemberDto } from "../../families/dto/family.dto";

export interface ListAudienceMemberDto {
  id: string;
  listId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMemberDto;
}

export interface ListItemDto {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  completedAt: string | null;
  completed: boolean;
  assignedFamilyMemberId: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListDto {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  category: string;
  description: string | null;
  archivedAt: string | null;
  archived: boolean;
  scope: "family" | "members";
  memberIds: string[];
  completedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  audienceMembers: ListAudienceMemberDto[];
  items: ListItemDto[];
}

export interface CreateListRequestDto {
  title?: unknown;
  icon?: unknown;
  category?: unknown;
  description?: unknown;
  scope?: unknown;
  memberIds?: unknown;
}

export interface UpdateListRequestDto {
  title?: unknown;
  icon?: unknown;
  category?: unknown;
  description?: unknown;
  scope?: unknown;
  memberIds?: unknown;
  archivedAt?: unknown;
}

export interface CreateListItemRequestDto {
  title?: unknown;
  description?: unknown;
  assignedFamilyMemberId?: unknown;
  assignedMemberIds?: unknown;
  dueDate?: unknown;
  sortOrder?: unknown;
}

export interface UpdateListItemRequestDto {
  title?: unknown;
  description?: unknown;
  completedAt?: unknown;
  assignedFamilyMemberId?: unknown;
  assignedMemberIds?: unknown;
  dueDate?: unknown;
  sortOrder?: unknown;
}
