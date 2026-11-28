import { Controller, Get } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import { Roles } from "../auth/decorators.js"
import { AdminCountsDto } from "./admin.dto.js"
import { AdminService } from "./admin.service.js"

/** Admin paneli genel uçları (yalnız admin). */
@ApiTags("admin")
@ApiCookieAuth()
@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** Kenar çubuğu rozetleri: onay bekleyen ilan, kurum başvurusu, açık şikâyet sayıları. */
  @Get("counts")
  @ApiOperation({ summary: "Bekleyen iş sayıları" })
  @ZodResponse({ status: 200, type: AdminCountsDto })
  counts(): Promise<AdminCountsDto> {
    return this.admin.counts()
  }
}
