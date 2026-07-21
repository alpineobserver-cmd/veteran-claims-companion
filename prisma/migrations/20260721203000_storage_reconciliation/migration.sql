CREATE TABLE "StorageReconciliationTask" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "principalHash" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityId" TEXT,
    "storageKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastErrorCode" TEXT NOT NULL,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageReconciliationTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageReconciliationTask_fingerprint_key" ON "StorageReconciliationTask"("fingerprint");
CREATE INDEX "StorageReconciliationTask_principalHash_status_idx" ON "StorageReconciliationTask"("principalHash", "status");
CREATE INDEX "StorageReconciliationTask_status_createdAt_idx" ON "StorageReconciliationTask"("status", "createdAt");
