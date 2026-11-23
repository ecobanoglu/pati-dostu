import { Module } from "@nestjs/common"

import { DictionaryController } from "./dictionary.controller.js"

/** Sözlük verileri: il, ilçe, tür, ırk (şimdilik il listesi). */
@Module({
  controllers: [DictionaryController],
})
export class DictionaryModule {}
