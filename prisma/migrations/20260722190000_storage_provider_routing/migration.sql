ALTER TABLE "StorageReconciliationTask"
ADD COLUMN "storageProvider" TEXT;

-- All object tasks created before this migration belong to the then-active
-- Vercel private Blob backend. Preserve their deletion route before a future
-- default-provider change.
UPDATE "StorageReconciliationTask"
SET "storageProvider" = 'vercel-private-blob'
WHERE "storageKey" IS NOT NULL;
