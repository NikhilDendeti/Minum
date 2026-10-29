import logging

from django.conf import settings
from django.db import connections, transaction

log = logging.getLogger("munim.grants")

# Tables the agent's run_sql may read, with the column that identifies the owning merchant.
# `conversations`, `otp_challenges` and Django's own tables are deliberately absent.
TENANT_COLUMN = {
    "merchants": "id",
    "transactions": "merchant_id",
    "settlements": "merchant_id",
    "customers": "merchant_id",
    "obligations": "merchant_id",
    "offers": "merchant_id",
}
READABLE_TABLES = list(TENANT_COLUMN)


def grant_readonly(using="default"):
    """Give the SELECT-only role access to the data tables and fence it to one merchant per query.

    Row-level security: the role only sees rows whose merchant matches the `app.merchant_id` setting that
    run_sql sets for each query. With no setting it sees nothing. The table owner (Django) is not affected.
    Idempotent; silent if the role is missing.
    """
    role = settings.READONLY_DB_USER
    try:
        with transaction.atomic(using=using), connections[using].cursor() as cur:  # savepoint: a failure must not poison an outer transaction
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
            if cur.fetchone() is None:
                log.warning("role %s not found; run_sql will fail until docker/init-readonly-role.sql has run", role)
                return False
            cur.execute("SET CONSTRAINTS ALL IMMEDIATE")  # ALTER TABLE refuses while FK checks are still pending (tests)
            for table, column in TENANT_COLUMN.items():
                cur.execute(f'GRANT SELECT ON "{table}" TO "{role}"')
                cur.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
                cur.execute(f'DROP POLICY IF EXISTS munim_tenant ON "{table}"')
                cur.execute(
                    f'CREATE POLICY munim_tenant ON "{table}" FOR SELECT TO "{role}" '
                    f"USING ({column} = NULLIF(current_setting('app.merchant_id', true), '')::bigint)")
        return True
    except Exception as exc:  # table not created yet, non-postgres db, etc.
        log.warning("grant_readonly skipped: %s", exc)
        return False
