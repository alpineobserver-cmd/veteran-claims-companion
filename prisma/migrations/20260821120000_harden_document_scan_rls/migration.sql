-- DocumentScan was created after the original schema-wide Data API hardening
-- migration. Keep the scanner table server-only and restore the same
-- defense-in-depth posture as every other application table.
ALTER TABLE public."DocumentScan" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."DocumentScan" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
