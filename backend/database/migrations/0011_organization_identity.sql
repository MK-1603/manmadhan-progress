ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "short_name" text;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "contact_email" text;
