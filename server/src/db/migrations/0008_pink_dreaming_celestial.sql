CREATE TABLE "app"."creator_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_subscription_id" text,
	"provider_plan_id" text NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"period_start" timestamp with time zone,
	"paid_through" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "creator_subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "app"."plan_usage_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plan_usage_nonnegative" CHECK ("app"."plan_usage_buckets"."used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."plan_usage_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bucket_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."subscription_invoices" (
	"provider_payment_id" text PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"provider_invoice_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"refunded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_invoices_provider_invoice_id_unique" UNIQUE("provider_invoice_id"),
	CONSTRAINT "subscription_invoice_amount_check" CHECK ("app"."subscription_invoices"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."plan_usage_reservations" ADD CONSTRAINT "plan_usage_reservations_bucket_key_plan_usage_buckets_key_fk" FOREIGN KEY ("bucket_key") REFERENCES "app"."plan_usage_buckets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_creator_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."creator_subscriptions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION app.reserve_plan_usage(reservation uuid, bucket text, maximum integer)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE consumed integer;
BEGIN
  IF maximum < 1 THEN RETURN false; END IF;
  INSERT INTO app.plan_usage_buckets(key) VALUES(bucket) ON CONFLICT DO NOTHING;
  SELECT used INTO consumed FROM app.plan_usage_buckets WHERE key = bucket FOR UPDATE;
  IF EXISTS (SELECT 1 FROM app.plan_usage_reservations WHERE id = reservation AND bucket_key = bucket) THEN
    RETURN true;
  END IF;
  IF consumed >= maximum THEN RETURN false; END IF;
  INSERT INTO app.plan_usage_reservations(id, bucket_key) VALUES(reservation, bucket);
  UPDATE app.plan_usage_buckets SET used = used + 1 WHERE key = bucket;
  RETURN true;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION app.release_plan_usage(reservation uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE bucket text;
BEGIN
  SELECT bucket_key INTO bucket FROM app.plan_usage_reservations WHERE id = reservation;
  IF bucket IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM app.plan_usage_buckets WHERE key = bucket FOR UPDATE;
  DELETE FROM app.plan_usage_reservations WHERE id = reservation;
  IF FOUND THEN
    UPDATE app.plan_usage_buckets SET used = used - 1 WHERE key = bucket;
  END IF;
END;
$$;
