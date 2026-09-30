ALTER TABLE "app"."stripe_products" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "app"."stripe_products" CASCADE;--> statement-breakpoint
ALTER TABLE "app"."payments" ALTER COLUMN "provider" DROP DEFAULT;