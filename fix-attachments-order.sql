-- Fix null order values in song_attachments table
UPDATE song_attachments SET "order" = 1 WHERE "order" IS NULL;

-- Set order based on creation time for better ordering
UPDATE song_attachments sa1
SET "order" = (
  SELECT COUNT(*) + 1
  FROM song_attachments sa2
  WHERE sa2."songId" = sa1."songId"
    AND sa2."createdAt" < sa1."createdAt"
    AND sa2."deletedAt" IS NULL
)
WHERE sa1."deletedAt" IS NULL;