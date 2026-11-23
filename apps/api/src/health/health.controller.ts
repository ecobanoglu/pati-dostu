import { Controller, Get } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import { Public } from "../auth/decorators.js"
import { HealthResponseDto } from "./health.dto.js"

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  /** API'nin ayakta olduğunu ve çalışma süresini döndürür; izleme servisleri için. */
  @Get()
  @ApiOperation({ summary: "Sağlık kontrolü" })
  @ZodResponse({ status: 200, type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    }
  }
}
