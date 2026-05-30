import { CalendarEventDto } from "../../calendar/dto/calendar.dto";
import { MealPlanDayDto } from "../../meals/dto/meal.dto";
import { TaskDto } from "../../tasks/dto/task.dto";
import { FamilyDto, FamilyMemberDto } from "./family.dto";

export interface FamilyDashboardDto {
  family: FamilyDto;
  members: FamilyMemberDto[];
  todayEvents: CalendarEventDto[];
  todayTasks: TaskDto[];
  dinnerToday: MealPlanDayDto | null;
  shoppingSummary: {
    uncheckedCount: number;
    totalItems: number;
  };
  wishlistSummary: {
    wishlistCount: number;
    upcomingPlaceholder: string;
    recentlyUpdated: {
      id: string;
      ownerFamilyMemberId: string;
      title: string;
      description: string | null;
      itemCount: number;
      unavailableCount: number;
      updatedAt: string;
    }[];
  };
}
