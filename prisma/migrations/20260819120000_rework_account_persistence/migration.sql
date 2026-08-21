-- Account-backed rework drafts and immutable approved package snapshots.
CREATE TABLE "ReworkProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReworkProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReworkPackageSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "checksum" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReworkPackageSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReworkProfile_userId_key" ON "ReworkProfile"("userId");
CREATE UNIQUE INDEX "ReworkPackageSnapshot_userId_packageId_key" ON "ReworkPackageSnapshot"("userId", "packageId");
CREATE INDEX "ReworkPackageSnapshot_userId_approvedAt_idx" ON "ReworkPackageSnapshot"("userId", "approvedAt");

ALTER TABLE "ReworkProfile" ADD CONSTRAINT "ReworkProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReworkPackageSnapshot" ADD CONSTRAINT "ReworkPackageSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReworkProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReworkPackageSnapshot" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."ReworkProfile" FROM %I', api_role);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."ReworkPackageSnapshot" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE "ReworkProfile" IS 'Private Debrief account workflow state. Access is only through owner-scoped server routes.';
COMMENT ON TABLE "ReworkPackageSnapshot" IS 'Immutable approved package snapshots used for owner-scoped downloads.';
