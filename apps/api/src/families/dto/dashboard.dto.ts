import { FamilyDto, FamilyMemberDto } from "./family.dto";

export interface FamilyDashboardDto {
  family: FamilyDto;
  members: FamilyMemberDto[];
  todayEvents: [];
  todayTasks: [];
  dinnerToday: null;
  shoppingSummary: {
    uncheckedCount: number;
  };
  wishlistSummary: {
    upcomingBirthdays: [];
  };
}
