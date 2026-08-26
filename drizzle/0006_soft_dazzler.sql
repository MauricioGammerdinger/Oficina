CREATE TABLE "vehicle_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"name" text NOT NULL,
	"estimated_value" double precision,
	"paid_value" double precision,
	"condition" text DEFAULT 'nova' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_parts" ADD CONSTRAINT "vehicle_parts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_parts_vehicle_idx" ON "vehicle_parts" USING btree ("vehicle_id");