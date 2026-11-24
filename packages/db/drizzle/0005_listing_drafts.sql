ALTER TABLE "listing" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "species_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "city_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_complete_unless_draft" CHECK ("listing"."status" = 'draft' or ("listing"."title" is not null and "listing"."slug" is not null and "listing"."description" is not null and "listing"."species_id" is not null and "listing"."city_id" is not null));