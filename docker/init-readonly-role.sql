-- Runs once, on first start of the database volume.
-- The agent's run_sql tool connects as munim_ro. SELECT is granted per table
-- by apps.core.grants (after migrate and after every seed), so only the six data
-- tables are readable; `conversations` and Django's own tables are not.
CREATE ROLE munim_ro LOGIN PASSWORD 'munim_ro';
GRANT CONNECT ON DATABASE munim TO munim_ro;
GRANT USAGE ON SCHEMA public TO munim_ro;
ALTER ROLE munim_ro SET default_transaction_read_only = on;
ALTER ROLE munim_ro SET statement_timeout = '3s';
