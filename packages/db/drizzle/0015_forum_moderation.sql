ALTER TABLE "forum_reply" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD COLUMN "removal_reason" text;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD COLUMN "removal_note" text;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "removal_reason" text;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "removal_note" text;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD CONSTRAINT "forum_reply_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD CONSTRAINT "forum_topic_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;