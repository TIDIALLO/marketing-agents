-- Synap6ia Marketing — Activate RLS on existing tables
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS before CREATE)
-- Depends on: docker/postgres/init-rls.sql (current_tenant_id() function)

-- ============================================================
-- 1. platform_users — has tenant_id column, use standard policy
-- ============================================================
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON platform_users;
CREATE POLICY tenant_isolation ON platform_users
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- 2. password_reset_tokens — no tenant_id column, join through user
-- ============================================================
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON password_reset_tokens;
CREATE POLICY tenant_isolation ON password_reset_tokens
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE platform_users.id = password_reset_tokens.user_id
        AND platform_users.tenant_id = current_tenant_id()
    )
  );
