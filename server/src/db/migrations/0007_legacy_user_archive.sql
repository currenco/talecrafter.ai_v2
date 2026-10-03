CREATE TABLE "app"."legacy_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_user_id" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_users_legacy_user_id_unique" ON "app"."legacy_users" USING btree ("legacy_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_users_email_unique" ON "app"."legacy_users" USING btree ("email");