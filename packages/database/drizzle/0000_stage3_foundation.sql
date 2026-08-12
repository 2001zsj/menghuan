CREATE TYPE "public"."anime_media_type" AS ENUM('tv', 'short', 'movie');--> statement-breakpoint
CREATE TYPE "public"."anime_release_status" AS ENUM('airing', 'finished', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."anime_season_relation_type" AS ENUM('primary', 'continuation', 'other');--> statement-breakpoint
CREATE TYPE "public"."broadcast_state" AS ENUM('updated', 'upcoming', 'tbd');--> statement-breakpoint
CREATE TYPE "public"."broadcast_type" AS ENUM('broadcast', 'streaming');--> statement-breakpoint
CREATE TYPE "public"."data_status" AS ENUM('mock', 'draft', 'verified', 'archived');--> statement-breakpoint
CREATE TYPE "public"."episode_publication_status" AS ENUM('published', 'upcoming', 'tbd');--> statement-breakpoint
CREATE TYPE "public"."episode_type" AS ENUM('regular', 'special', 'recap', 'movie');--> statement-breakpoint
CREATE TYPE "public"."resource_category" AS ENUM('official_site', 'official_social', 'official_video_channel', 'broadcaster', 'verified_licensed_streaming', 'distributor', 'encyclopedia', 'rating_site', 'database', 'news', 'search', 'approved_other');--> statement-breakpoint
CREATE TYPE "public"."season_quarter" AS ENUM('winter', 'spring', 'summer', 'autumn', 'other');--> statement-breakpoint
CREATE TYPE "public"."season_type" AS ENUM('broadcast', 'release', 'other');--> statement-breakpoint
CREATE TYPE "public"."weekday" AS ENUM('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');--> statement-breakpoint
CREATE TABLE "anime" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"aliases" text[] NOT NULL,
	"synopsis" text NOT NULL,
	"media_type" "anime_media_type" NOT NULL,
	"release_status" "anime_release_status" NOT NULL,
	"tags" text[] NOT NULL,
	"data_status" "data_status" NOT NULL,
	"is_mock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "anime_title_not_blank" CHECK (length(trim("anime"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "anime_cast_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"anime_id" text NOT NULL,
	"character_name" text NOT NULL,
	"performer_name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anime_resource_categories" (
	"anime_id" text NOT NULL,
	"category" "resource_category" NOT NULL,
	"sort_order" integer NOT NULL,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "anime_resource_categories_anime_id_category_pk" PRIMARY KEY("anime_id","category")
);
--> statement-breakpoint
CREATE TABLE "anime_seasons" (
	"anime_id" text NOT NULL,
	"season_id" text NOT NULL,
	"relation_type" "anime_season_relation_type" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "anime_seasons_anime_id_season_id_pk" PRIMARY KEY("anime_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "anime_staff_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"anime_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_info" (
	"id" text PRIMARY KEY NOT NULL,
	"anime_id" text NOT NULL,
	"broadcast_type" "broadcast_type" NOT NULL,
	"source_timezone" text,
	"source_original_date_text" text,
	"source_original_time_text" text,
	"original_expression" text NOT NULL,
	"normalized_start_at" timestamp with time zone,
	"source_weekday" "weekday",
	"availability_state" "broadcast_state" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_tentative" boolean DEFAULT false NOT NULL,
	"note" text,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "broadcast_info_tbd_time_null" CHECK ("broadcast_info"."availability_state" <> 'tbd' or "broadcast_info"."normalized_start_at" is null),
	CONSTRAINT "broadcast_info_normalized_requires_timezone" CHECK ("broadcast_info"."normalized_start_at" is null or "broadcast_info"."source_timezone" is not null)
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"anime_id" text NOT NULL,
	"episode_type" "episode_type" NOT NULL,
	"sort_value" integer NOT NULL,
	"display_number" text NOT NULL,
	"title" text NOT NULL,
	"normalized_release_at" timestamp with time zone,
	"publication_status" "episode_publication_status" NOT NULL,
	"is_recap" boolean DEFAULT false NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "episodes_sort_nonnegative" CHECK ("episodes"."sort_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"quarter" "season_quarter" NOT NULL,
	"label" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"reference_timezone" text,
	"season_type" "season_type" NOT NULL,
	"data_status" "data_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seasons_year_range" CHECK ("seasons"."year" between 1900 and 2200),
	CONSTRAINT "seasons_date_order" CHECK ("seasons"."start_date" is null or "seasons"."end_date" is null or "seasons"."start_date" <= "seasons"."end_date")
);
--> statement-breakpoint
ALTER TABLE "anime_cast_credits" ADD CONSTRAINT "anime_cast_credits_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_resource_categories" ADD CONSTRAINT "anime_resource_categories_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_seasons" ADD CONSTRAINT "anime_seasons_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_seasons" ADD CONSTRAINT "anime_seasons_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anime_staff_credits" ADD CONSTRAINT "anime_staff_credits_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_info" ADD CONSTRAINT "broadcast_info_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anime_slug_unique" ON "anime" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "anime_created_at_idx" ON "anime" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_cast_credit_unique" ON "anime_cast_credits" USING btree ("anime_id","character_name","performer_name");--> statement-breakpoint
CREATE INDEX "anime_cast_credit_order_idx" ON "anime_cast_credits" USING btree ("anime_id","sort_order");--> statement-breakpoint
CREATE INDEX "anime_resource_category_order_idx" ON "anime_resource_categories" USING btree ("anime_id","sort_order");--> statement-breakpoint
CREATE INDEX "anime_seasons_season_idx" ON "anime_seasons" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_staff_credit_unique" ON "anime_staff_credits" USING btree ("anime_id","role","name");--> statement-breakpoint
CREATE INDEX "anime_staff_credit_order_idx" ON "anime_staff_credits" USING btree ("anime_id","sort_order");--> statement-breakpoint
CREATE INDEX "broadcast_info_anime_idx" ON "broadcast_info" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "broadcast_info_start_idx" ON "broadcast_info" USING btree ("normalized_start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_anime_sort_unique" ON "episodes" USING btree ("anime_id","sort_value");--> statement-breakpoint
CREATE INDEX "episodes_anime_idx" ON "episodes" USING btree ("anime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_year_quarter_type_unique" ON "seasons" USING btree ("year","quarter","season_type");