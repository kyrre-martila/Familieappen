import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { createApiResponse } from "../common";
import { AdminRequestUser } from "./admin-auth.service";
import { firstHeaderValue } from "./admin-cookie";
import { AdminRoles } from "./decorators/admin-roles.decorator";
import { AdminApiService } from "./admin-api.service";
import { AdvertisementMutationDto, AdvertisementQueryDto, AuditLogQueryDto, CreateAdminUserDto, PageQueryDto, UpdateAdminUserDto, UpdateUserStatusDto } from "./dto/admin-api.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { AdminRolesGuard } from "./guards/admin-roles.guard";

@Controller("admin")
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminApiController {
  constructor(private readonly service: AdminApiService) {}
  @Get("dashboard") @AdminRoles("SUPER_ADMIN","SUPPORT","ANALYST","AD_MANAGER") dashboard(){ return this.wrap(this.service.dashboard()); }
  @Get("users") @AdminRoles("SUPER_ADMIN","SUPPORT") users(@Query() q:PageQueryDto){ return this.wrap(this.service.users(q)); }
  @Get("users/:id") @AdminRoles("SUPER_ADMIN","SUPPORT") user(@Param("id") id:string){ return this.wrap(this.service.user(id)); }
  @Patch("users/:id/status") @AdminRoles("SUPER_ADMIN","SUPPORT") setUserStatus(@Param("id") id:string,@Body() b:UpdateUserStatusDto,@Req() r:any){ return this.wrap(this.service.setUserStatus(id,b,r.admin,this.meta(r))); }
  @Get("statistics") @AdminRoles("SUPER_ADMIN","ANALYST") statistics(){ return this.wrap(this.service.statistics()); }
  @Get("advertisements") @AdminRoles("SUPER_ADMIN","AD_MANAGER") advertisements(@Query() q:AdvertisementQueryDto){ return this.wrap(this.service.advertisements(q)); }
  @Post("advertisements") @AdminRoles("SUPER_ADMIN","AD_MANAGER") createAd(@Body() b:AdvertisementMutationDto,@Req() r:any){ return this.wrap(this.service.createAdvertisement(b,r.admin,this.meta(r))); }
  @Get("advertisements/:id") @AdminRoles("SUPER_ADMIN","AD_MANAGER") ad(@Param("id") id:string){ return this.wrap(this.service.advertisement(id)); }
  @Patch("advertisements/:id") @AdminRoles("SUPER_ADMIN","AD_MANAGER") updateAd(@Param("id") id:string,@Body() b:AdvertisementMutationDto,@Req() r:any){ return this.wrap(this.service.updateAdvertisement(id,b,r.admin,this.meta(r))); }
  @Delete("advertisements/:id") @AdminRoles("SUPER_ADMIN","AD_MANAGER") deleteAd(@Param("id") id:string,@Req() r:any){ return this.wrap(this.service.deleteAdvertisement(id,r.admin,this.meta(r))); }
  @Get("admin-users") @AdminRoles("SUPER_ADMIN") adminUsers(){ return this.wrap(this.service.adminUsers()); }
  @Post("admin-users") @AdminRoles("SUPER_ADMIN") createAdmin(@Body() b:CreateAdminUserDto,@Req() r:any){ return this.wrap(this.service.createAdmin(b,r.admin,this.meta(r))); }
  @Patch("admin-users/:id") @AdminRoles("SUPER_ADMIN") updateAdmin(@Param("id") id:string,@Body() b:UpdateAdminUserDto,@Req() r:any){ return this.wrap(this.service.updateAdmin(id,b,r.admin,this.meta(r))); }
  @Get("audit-log") @AdminRoles("SUPER_ADMIN") auditLog(@Query() q:AuditLogQueryDto,@Req() r:{admin:AdminRequestUser}){ return this.wrap(this.service.auditLog(q,r.admin)); }
  private async wrap<T>(p:Promise<T>){ return createApiResponse(await p); }
  private meta(request:any){ const forwardedFor = firstHeaderValue(request.headers?.["x-forwarded-for"]); return { userAgent: firstHeaderValue(request.headers?.["user-agent"]), ipAddress: forwardedFor?.split(",")[0]?.trim() || request.ip || request.socket?.remoteAddress || null }; }
}
