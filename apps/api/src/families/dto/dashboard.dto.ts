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
    upcomingBirthdays: [];
  };
}
