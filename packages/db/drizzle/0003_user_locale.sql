CREATE TYPE "public"."locale" AS ENUM('tr', 'en');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" "locale" DEFAULT 'tr' NOT NULL;