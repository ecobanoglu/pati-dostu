CREATE TYPE "public"."age_group" AS ENUM('puppy', 'young', 'adult', 'senior');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('pending', 'interview', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."banned_term_category" AS ENUM('insult', 'sale', 'other');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('unknown', 'male', 'female');--> statement-breakpoint
CREATE TYPE "public"."listing_source" AS ENUM('foster_home', 'street', 'shelter', 'clinic');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending', 'changes_requested', 'active', 'adopted', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('adoption', 'foster', 'lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."moderation_area" AS ENUM('listing', 'comment', 'topic', 'reply', 'message', 'contact');--> statement-breakpoint
CREATE TYPE "public"."moderation_rule_kind" AS ENUM('phone', 'email', 'url', 'iban', 'price', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('clinic', 'shelter');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'pending', 'scheduled', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('blog', 'news');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('listing', 'comment', 'topic', 'reply', 'user');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'clinic', 'shelter', 'admin');--> statement-breakpoint
CREATE TYPE "public"."share_template" AS ENUM('classic', 'polaroid', 'poster', 'minimal', 'orange', 'character');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."term_match" AS ENUM('exact', 'contains');--> statement-breakpoint
CREATE TABLE "adoption_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"applicant_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"contract_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "success_story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"photo_url" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"phone" text,
	"city_id" uuid,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "forum_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "forum_reply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"is_best_answer" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forum_reply_like" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reply_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_reply_like_replyId_userId_unique" UNIQUE("reply_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"is_solved" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"answer_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "forum_topic_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "post_type" NOT NULL,
	"author_id" text NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" jsonb NOT NULL,
	"cover_url" text,
	"country" text,
	"source_url" text,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"reading_time" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "post_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_tag" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_tag_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "breed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"species_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"size" "size",
	"is_mixed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "breed_speciesId_slug_unique" UNIQUE("species_id","slug")
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plate_code" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "city_slug_unique" UNIQUE("slug"),
	CONSTRAINT "city_plateCode_unique" UNIQUE("plate_code")
);
--> statement-breakpoint
CREATE TABLE "district" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "district_cityId_slug_unique" UNIQUE("city_id","slug")
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "species_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_userId_listingId_unique" UNIQUE("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_no" integer GENERATED ALWAYS AS IDENTITY (sequence name "listing_listing_no_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 100001 CACHE 1),
	"owner_id" text NOT NULL,
	"type" "listing_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"species_id" uuid NOT NULL,
	"breed_id" uuid,
	"name" text,
	"gender" "gender" DEFAULT 'unknown' NOT NULL,
	"age_group" "age_group",
	"size" "size",
	"vaccinated" boolean DEFAULT false NOT NULL,
	"neutered" boolean DEFAULT false NOT NULL,
	"microchipped" boolean DEFAULT false NOT NULL,
	"microchip_number" text,
	"child_friendly" boolean DEFAULT false NOT NULL,
	"source" "listing_source",
	"city_id" uuid NOT NULL,
	"district_id" uuid,
	"last_seen_address" text,
	"last_seen_lat" double precision,
	"last_seen_lng" double precision,
	"show_phone" boolean DEFAULT false NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"review_fields" text[],
	"rejection_reason" text,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('turkish', coalesce("title", '')), 'A') || setweight(to_tsvector('turkish', coalesce("description", '')), 'B')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "listing_listingNo_unique" UNIQUE("listing_no")
);
--> statement-breakpoint
CREATE TABLE "listing_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listing_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"image_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listing_share_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"template" "share_template" NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "listing_share_image_listingId_template_unique" UNIQUE("listing_id","template")
);
--> statement-breakpoint
CREATE TABLE "saved_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"filters" jsonb NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"notify_push" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"starter_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "conversation_listingId_starterId_unique" UNIQUE("listing_id","starter_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "banned_term" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"category" "banned_term_category" NOT NULL,
	"match" "term_match" DEFAULT 'contains' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "banned_term_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "moderation_hit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"term_id" uuid,
	"area" "moderation_area" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_hit_source" CHECK ("moderation_hit"."rule_id" is not null or "moderation_hit"."term_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "moderation_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "moderation_rule_kind" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"areas" "moderation_area"[] NOT NULL,
	"user_message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "moderation_rule_kind_unique" UNIQUE("kind")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "org_closures_orgId_date_unique" UNIQUE("org_id","date")
);
--> statement-breakpoint
CREATE TABLE "org_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "org_hours_weekday_range" CHECK ("org_hours"."weekday" between 0 and 6),
	CONSTRAINT "org_hours_range_order" CHECK ("org_hours"."opens_at" < "org_hours"."closes_at")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "organization_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"registry_no" text NOT NULL,
	"description" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text NOT NULL,
	"city_id" uuid NOT NULL,
	"district_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"capacity" integer,
	"is24h" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "adoption_application" ADD CONSTRAINT "adoption_application_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_application" ADD CONSTRAINT "adoption_application_applicant_id_user_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_story" ADD CONSTRAINT "success_story_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_story" ADD CONSTRAINT "success_story_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD CONSTRAINT "forum_reply_topic_id_forum_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply" ADD CONSTRAINT "forum_reply_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_like" ADD CONSTRAINT "forum_reply_like_reply_id_forum_reply_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_reply"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reply_like" ADD CONSTRAINT "forum_reply_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD CONSTRAINT "forum_topic_category_id_forum_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic" ADD CONSTRAINT "forum_topic_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_category_id_post_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."post_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breed" ADD CONSTRAINT "breed_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district" ADD CONSTRAINT "district_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_breed_id_breed_id_fk" FOREIGN KEY ("breed_id") REFERENCES "public"."breed"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_district_id_district_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."district"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_comment" ADD CONSTRAINT "listing_comment_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_comment" ADD CONSTRAINT "listing_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_comment" ADD CONSTRAINT "listing_comment_parent_id_listing_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."listing_comment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_image" ADD CONSTRAINT "listing_image_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_share_image" ADD CONSTRAINT "listing_share_image_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_starter_id_user_id_fk" FOREIGN KEY ("starter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_hit" ADD CONSTRAINT "moderation_hit_rule_id_moderation_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."moderation_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_hit" ADD CONSTRAINT "moderation_hit_term_id_banned_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."banned_term"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_closures" ADD CONSTRAINT "org_closures_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_hours" ADD CONSTRAINT "org_hours_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_district_id_district_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."district"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adoption_application_listing_id_status_index" ON "adoption_application" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "adoption_application_applicant_id_index" ON "adoption_application" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "success_story_status_index" ON "success_story" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_index" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "forum_reply_topic_id_created_at_index" ON "forum_reply" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_topic_category_id_status_created_at_index" ON "forum_topic" USING btree ("category_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "forum_topic_author_id_index" ON "forum_topic" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "forum_topic_title_trgm_idx" ON "forum_topic" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "post_type_status_published_at_index" ON "post" USING btree ("type","status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "post_category_id_index" ON "post" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "post_tag_tag_id_index" ON "post_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "breed_species_id_index" ON "breed" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "district_city_id_index" ON "district" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "favorite_listing_id_index" ON "favorite" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_public_idx" ON "listing" USING btree ("status","species_id","city_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "listing_owner_id_index" ON "listing" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "listing_search_idx" ON "listing" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "listing_title_trgm_idx" ON "listing" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "listing_comment_listing_id_created_at_index" ON "listing_comment" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_image_listing_id_index" ON "listing_image" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_image_image_hash_index" ON "listing_image" USING btree ("image_hash");--> statement-breakpoint
CREATE INDEX "saved_search_user_id_index" ON "saved_search" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_starter_id_last_message_at_index" ON "conversation" USING btree ("starter_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversation_owner_id_last_message_at_index" ON "conversation" USING btree ("owner_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "message_conversation_id_created_at_index" ON "message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_hit_created_at_index" ON "moderation_hit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_status_created_at_index" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "report_target_type_target_id_index" ON "report" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "org_hours_org_id_weekday_index" ON "org_hours" USING btree ("org_id","weekday");--> statement-breakpoint
CREATE INDEX "organization_type_status_city_id_index" ON "organization" USING btree ("type","status","city_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_index" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_index" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_user_id_read_at_created_at_index" ON "notification" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);