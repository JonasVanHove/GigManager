-- Add custom navigation tab preferences to UserSettings
ALTER TABLE "UserSettings"
  ADD COLUMN "customTab1" TEXT NOT NULL DEFAULT 'setlists',
  ADD COLUMN "customTab2" TEXT NOT NULL DEFAULT 'songs';