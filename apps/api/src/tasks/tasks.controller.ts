import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { CreateTaskRequestDto, TaskDto } from "./dto/task.dto";
import { TasksService } from "./tasks.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("tasks")
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async listTasks(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<TaskDto[]>> {
    return createApiResponse(await this.tasksService.listTasks(request.user.id, familyId));
  }

  @Post()
  async createTask(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: CreateTaskRequestDto
  ): Promise<ApiResponse<TaskDto>> {
    return createApiResponse(await this.tasksService.createTask(request.user.id, familyId, body));
  }

  @Patch(":taskId")
  async toggleTask(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("taskId") taskId: string
  ): Promise<ApiResponse<TaskDto>> {
    return createApiResponse(await this.tasksService.toggleTask(request.user.id, familyId, taskId));
  }

  @Delete(":taskId")
  async deleteTask(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("taskId") taskId: string
  ): Promise<ApiResponse<TaskDto>> {
    return createApiResponse(await this.tasksService.deleteTask(request.user.id, familyId, taskId));
  }
}
