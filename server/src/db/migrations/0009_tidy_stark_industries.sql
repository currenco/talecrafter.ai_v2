CREATE TABLE "app"."subscription_holds" (
	"provider_payment_id" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
