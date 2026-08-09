ALTER TABLE "invitations" ADD COLUMN "permissions" json;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "smtp_response" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "email_delivery_time" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "email_open_time" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "email_click_time" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "otp_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "password_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "profile_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "workspace_assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "permissions" json;