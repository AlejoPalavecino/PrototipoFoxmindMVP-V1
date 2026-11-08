ALTER TABLE "users" ADD COLUMN "avatar_key" TEXT NOT NULL DEFAULT 'initials';
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_key_check"
  CHECK ("avatar_key" IN ('initials', 'foxy-classic', 'foxy-reader', 'foxy-explorer', 'foxy-creative'));
