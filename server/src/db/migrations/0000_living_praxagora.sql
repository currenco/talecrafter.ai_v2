CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "app"."assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"story_id" uuid,
	"provider" varchar(40) NOT NULL,
	"bucket" varchar(120) NOT NULL,
	"object_key" text NOT NULL,
	"access" varchar(20) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" integer NOT NULL,
	"status" varchar(20) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_access_check" CHECK ("app"."assets"."access" IN ('public', 'private')),
	CONSTRAINT "assets_byte_size_check" CHECK ("app"."assets"."byte_size" >= 0),
	CONSTRAINT "assets_status_check" CHECK ("app"."assets"."status" IN ('pending', 'ready', 'failed', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "app"."credit_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_accounts_balance_check" CHECK ("app"."credit_accounts"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" varchar(40) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"reference_type" varchar(40),
	"reference_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_amount_check" CHECK ("app"."credit_ledger"."amount" <> 0),
	CONSTRAINT "credit_ledger_balance_after_check" CHECK ("app"."credit_ledger"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"story_id" uuid,
	"idempotency_key" varchar(255) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"request" jsonb NOT NULL,
	"result" jsonb,
	"error_code" varchar(80),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_jobs_status_check" CHECK ("app"."generation_jobs"."status" IN ('pending', 'running', 'succeeded', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app"."interactive_stories" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"root_node_id" uuid NOT NULL,
	"current_node_id" uuid NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"compiled_pages" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."interactive_story_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"parent_node_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"choice_taken" text,
	"choices" jsonb,
	"selected_choice" text,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactive_nodes_depth_check" CHECK ("app"."interactive_story_nodes"."depth" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid,
	"provider" varchar(40) NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(40) DEFAULT 'stripe' NOT NULL,
	"provider_session_id" varchar(255) NOT NULL,
	"provider_payment_intent_id" varchar(255),
	"email_snapshot" varchar(320) NOT NULL,
	"plan_id" varchar(80) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'usd' NOT NULL,
	"credits" integer NOT NULL,
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("app"."payments"."amount_cents" > 0),
	CONSTRAINT "payments_credits_check" CHECK ("app"."payments"."credits" > 0),
	CONSTRAINT "payments_status_check" CHECK ("app"."payments"."status" IN ('pending', 'fulfilled', 'failed', 'cancelled', 'refunded'))
);
--> statement-breakpoint
CREATE TABLE "app"."seed_records" (
	"namespace" varchar(80) NOT NULL,
	"key" varchar(120) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seed_records_namespace_key_pk" PRIMARY KEY("namespace","key")
);
--> statement-breakpoint
CREATE TABLE "app"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" varchar(90) NOT NULL,
	"kind" varchar(20) DEFAULT 'classic' NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"title" text NOT NULL,
	"story_subject" text,
	"story_type" varchar(80),
	"age_group" varchar(40),
	"image_style" varchar(80),
	"cover_image_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_kind_check" CHECK ("app"."stories"."kind" IN ('classic', 'interactive')),
	CONSTRAINT "stories_status_check" CHECK ("app"."stories"."status" IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "app"."story_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" jsonb NOT NULL,
	"provider_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_versions_version_check" CHECK ("app"."story_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"avatar_url" text,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_role_check" CHECK ("app"."user_profiles"."role" IN ('user', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "app"."assets" ADD CONSTRAINT "assets_owner_id_user_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."assets" ADD CONSTRAINT "assets_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."credit_accounts" ADD CONSTRAINT "credit_accounts_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."credit_ledger" ADD CONSTRAINT "credit_ledger_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "app"."credit_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_owner_id_user_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."interactive_stories" ADD CONSTRAINT "interactive_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."interactive_story_nodes" ADD CONSTRAINT "interactive_story_nodes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stories" ADD CONSTRAINT "stories_owner_id_user_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."story_versions" ADD CONSTRAINT "story_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_provider_bucket_key_unique" ON "app"."assets" USING btree ("provider","bucket","object_key");--> statement-breakpoint
CREATE INDEX "assets_owner_created_idx" ON "app"."assets" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "assets_story_idx" ON "app"."assets" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_user_id_unique" ON "app"."credit_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_idempotency_key_unique" ON "app"."credit_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_ledger_account_created_idx" ON "app"."credit_ledger" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_owner_idempotency_unique" ON "app"."generation_jobs" USING btree ("owner_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "generation_jobs_owner_created_idx" ON "app"."generation_jobs" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "interactive_nodes_story_created_idx" ON "app"."interactive_story_nodes" USING btree ("story_id","created_at");--> statement-breakpoint
CREATE INDEX "interactive_nodes_parent_idx" ON "app"."interactive_story_nodes" USING btree ("parent_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_unique" ON "app"."payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_payment_idx" ON "app"."payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_session_unique" ON "app"."payments" USING btree ("provider","provider_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_intent_unique" ON "app"."payments" USING btree ("provider","provider_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "app"."payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "app"."payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_public_id_unique" ON "app"."stories" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_slug_unique" ON "app"."stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stories_owner_created_idx" ON "app"."stories" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "stories_public_status_created_idx" ON "app"."stories" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "stories_type_idx" ON "app"."stories" USING btree ("story_type");--> statement-breakpoint
CREATE UNIQUE INDEX "story_versions_story_version_unique" ON "app"."story_versions" USING btree ("story_id","version");--> statement-breakpoint
CREATE INDEX "story_versions_story_created_idx" ON "app"."story_versions" USING btree ("story_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_auth_user_id_unique" ON "app"."user_profiles" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_email_idx" ON "app"."user_profiles" USING btree ("email");