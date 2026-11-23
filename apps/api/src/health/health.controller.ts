import { Controller, Get } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import { HealthResponseDto } from "./health.dto.js"

@ApiTags("health")
@Controller("health")
export class HealthController {
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
