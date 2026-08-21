CREATE TABLE "allowed_signup_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "convites_email_unico" ON "allowed_signup_emails" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unico" ON "users" USING btree ("email");