CREATE TYPE "public"."report_reason" AS ENUM('sale', 'fake', 'animal_abuse', 'inappropriate', 'spam', 'misinformation', 'harassment', 'fake_account', 'other');--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "reason" SET DATA TYPE "public"."report_reason" USING "reason"::"public"."report_reason";--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "details" text;