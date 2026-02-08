-- Synap6ia Marketing — PostgreSQL RLS Initialization
-- This script runs on first database creation via docker-entrypoint-initdb.d
-- It enables RLS and creates the tenant isolation infrastructure.
-- Actual table policies are applied by Prisma migrations + post-migration scripts.

-- Enable Row Level Security support
-- Note: RLS policies on individual tables are created after Prisma migrations
-- This script sets up the foundational configuration.

-- 1. Create the application setting for tenant isolation
-- Each API request sets this via: SET app.current_tenant_id = '<tenant_id>';
DO $$
BEGIN
  -- Ensure the custom GUC parameter namespace exists
  PERFORM set_config('app.current_tenant_id', '', true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Create a helper function to get current tenant ID
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create a helper function to enable RLS on a table with tenant isolation
-- Usage: SELECT enable_tenant_rls('table_name');
CREATE OR REPLACE FUNCTION enable_tenant_rls(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant_id())',
    table_name
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Create extension for UUID generation (used by cuid alternative)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 5. Create n8n database if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n') THEN
    PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE n8n');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
