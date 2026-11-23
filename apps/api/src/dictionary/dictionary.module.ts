import { Module } from "@nestjs/common"

import { DictionaryController } from "./dictionary.controller.js"
import { DictionaryService } from "./dictionary.service.js"

/** Sözlük verileri: il, ilçe, tür, ırk (herkese açık, önbelleklenebilir). */
@Module({
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
