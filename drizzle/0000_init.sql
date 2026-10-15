CREATE TYPE "public"."adoption_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."checkin_kind" AS ENUM('VOLUNTEER_CHECKIN', 'TREE_WATERING', 'ISSUE_REPORT');--> statement-breakpoint
CREATE TYPE "public"."checkin_source" AS ENUM('NFC', 'WEB');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('SUBMISSION_ACK', 'REVIEWER_ALERT', 'INFO_REQUEST', 'APPROVED', 'DECLINED', 'PUBLISHED', 'ADOPTION_RECEIVED', 'ADOPTION_DECISION', 'SIGNUP_CONFIRMATION', 'EVENT_REMINDER', 'TREE_CHECKPOINT', 'STEWARD_WELCOME');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('CLEANUP', 'TREE_PLANTING', 'BEAUTIFICATION', 'ILLEGAL_DUMPING');--> statement-breakpoint
CREATE TYPE "public"."submitter_kind" AS ENUM('PARTNER', 'COMMUNITY_GROUP');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"project_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adoption_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"project_id" text NOT NULL,
	"org_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"group_size" integer NOT NULL,
	"message" text,
	"status" "adoption_status" DEFAULT 'PENDING' NOT NULL,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"kind" "checkin_kind" NOT NULL,
	"source" "checkin_source" DEFAULT 'WEB' NOT NULL,
	"project_id" text,
	"tree_id" text,
	"name" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"canopy_pct" real NOT NULL,
	"heat_index" real NOT NULL,
	"litter_index" real NOT NULL,
	"need_score" real NOT NULL,
	CONSTRAINT "neighborhoods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"project_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"title" text NOT NULL,
	"type" "project_type" NOT NULL,
	"status" "project_status" DEFAULT 'SUBMITTED' NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"lat" real,
	"lng" real,
	"neighborhood_id" text,
	"site_ownership_confirmed" boolean DEFAULT false NOT NULL,
	"site_owner_note" text,
	"submitter_kind" "submitter_kind" NOT NULL,
	"submitter_name" text NOT NULL,
	"submitter_org" text NOT NULL,
	"submitter_email" text NOT NULL,
	"submitter_phone" text,
	"submitter_verified" boolean DEFAULT false NOT NULL,
	"event_date" timestamp with time zone,
	"duration_hours" real,
	"volunteer_estimate" integer,
	"tools_needed" text,
	"waste_handling" text,
	"safety_notes" text,
	"external_refs" text,
	"reviewer_note" text,
	"published_at" timestamp with time zone,
	"priority_flag" boolean DEFAULT false NOT NULL,
	"adopted_by_org" text,
	"adopted_by_name" text,
	"adopted_by_email" text,
	"result_volunteers" integer,
	"result_hours" real,
	"result_waste_lbs" real,
	"result_trees_planted" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signups" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"waiver_accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"project_id" text,
	"tree_id" text,
	"taps" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"project_id" text NOT NULL,
	"label" text NOT NULL,
	"species" text,
	"steward_name" text NOT NULL,
	"steward_email" text NOT NULL,
	"steward_phone" text,
	"commitment_accepted_at" timestamp with time zone,
	"commitment_ends_at" timestamp with time zone,
	"planted_at" timestamp with time zone,
	"watering_interval_days" integer DEFAULT 7 NOT NULL,
	"status" text DEFAULT 'PLANTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signups" ADD CONSTRAINT "signups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_project_idx" ON "activity" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "checkins_tree_idx" ON "check_ins" USING btree ("tree_id","created_at");--> statement-breakpoint
CREATE INDEX "checkins_project_idx" ON "check_ins" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "signups_project_email" ON "signups" USING btree ("project_id","email");