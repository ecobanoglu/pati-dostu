ALTER TABLE "post_category" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('tr', "name");--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;