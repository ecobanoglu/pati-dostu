CREATE TABLE "forum_topic_follow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_topic_follow_topicId_userId_unique" UNIQUE("topic_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_topic_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_category" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('tr', "name");--> statement-breakpoint
ALTER TABLE "forum_category" ALTER COLUMN "description" SET DATA TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('tr', "description") END;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "species_id" uuid;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topic_follow" ADD CONSTRAINT "forum_topic_follow_topic_id_forum_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_follow" ADD CONSTRAINT "forum_topic_follow_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_image" ADD CONSTRAINT "forum_topic_image_topic_id_forum_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_topic_follow_user_id_index" ON "forum_topic_follow" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_topic_image_topic_id_sort_order_index" ON "forum_topic_image" USING btree ("topic_id","sort_order");--> statement-breakpoint
ALTER TABLE "forum_topic" ADD CONSTRAINT "forum_topic_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;