ALTER TABLE "app"."generation_jobs" ADD COLUMN "request_hash" varchar(64) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "provider" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "model" varchar(120) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "credit_cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "attempt_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_credit_cost_check" CHECK ("app"."generation_jobs"."credit_cost" >= 0);--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_attempt_count_check" CHECK ("app"."generation_jobs"."attempt_count" > 0);--> statement-breakpoint
ALTER TABLE "app"."generation_jobs" ADD CONSTRAINT "generation_jobs_duration_check" CHECK ("app"."generation_jobs"."duration_ms" IS NULL OR "app"."generation_jobs"."duration_ms" >= 0);