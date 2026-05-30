import { TaskDto } from "../../tasks/dto/task.dto";
import { FamilyDto, FamilyMemberDto } from "./family.dto";

export interface FamilyDashboardDto {
  family: FamilyDto;
  members: FamilyMemberDto[];
  todayEvents: [];
  todayTasks: TaskDto[];
  dinnerToday: null;
  shoppingSummary: {
    uncheckedCount: number;
    totalItems: number;
  };
  wishlistSummary: {
    upcomingBirthdays: [];
  };
}
