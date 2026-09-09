-- Add overview view-mode preference to UserSettings
ALTER TABLE "UserSettings"
  ADD COLUMN "overviewViewMode" TEXT NOT NULL DEFAULT 'grid';