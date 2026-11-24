import { createZodDto } from "nestjs-zod"
import { z } from "zod"

/** GET /me/favorites/ids: favorideki ilanların numaraları (kalplerin dolu/boş hâli). */
export class FavoriteIdsDto extends createZodDto(
  z.object({ listingNos: z.array(z.number().int()) }).meta({ id: "FavoriteIds" })
) {}
