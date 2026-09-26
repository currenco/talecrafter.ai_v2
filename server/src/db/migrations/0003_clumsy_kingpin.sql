CREATE TABLE "app"."stripe_products" (
	"plan_id" varchar(80) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"price_id" varchar(255) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'usd' NOT NULL,
	"credits" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_products_amount_check" CHECK ("app"."stripe_products"."amount_cents" > 0),
	CONSTRAINT "stripe_products_credits_check" CHECK ("app"."stripe_products"."credits" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."payments" ADD COLUMN "provider_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "app"."payments" ADD COLUMN "provider_price_id" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_products_product_id_unique" ON "app"."stripe_products" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_products_price_id_unique" ON "app"."stripe_products" USING btree ("price_id");