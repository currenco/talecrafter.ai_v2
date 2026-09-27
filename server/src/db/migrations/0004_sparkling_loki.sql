CREATE TABLE "app"."pollinations_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_user_id" text,
	"provider_username" text,
	"encrypted_access_token" text NOT NULL,
	"scope" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."pollinations_oauth_states" (
	"state_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_code_verifier" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."pollinations_connections" ADD CONSTRAINT "pollinations_connections_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pollinations_oauth_states" ADD CONSTRAINT "pollinations_oauth_states_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pollinations_connections_user_unique" ON "app"."pollinations_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pollinations_connections_expires_idx" ON "app"."pollinations_connections" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pollinations_oauth_states_user_idx" ON "app"."pollinations_oauth_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pollinations_oauth_states_expires_idx" ON "app"."pollinations_oauth_states" USING btree ("expires_at");