import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from apps.core.grants import grant_readonly


class Command(BaseCommand):
    help = ("Create (or update the password of) the SELECT-only Postgres role the agent's SQL runs as, from "
            "READONLY_DATABASE_URL. docker/init-readonly-role.sql does this on local Docker; hosted Postgres "
            "(Railway) has no init script, so run this once per deploy, after migrate.")

    def handle(self, *args, **options):
        role, password = settings.READONLY_DB_USER, settings.READONLY_DB_PASSWORD
        database = settings.DATABASES["default"]["NAME"]
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", role) or not re.fullmatch(r"[a-z_][a-z0-9_-]*", database):
            raise CommandError(f"unsafe role or database name: {role!r}, {database!r}")
        literal = "'" + password.replace("'", "''") + "'"
        with connection.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
            verb = "ALTER" if cur.fetchone() else "CREATE"
            cur.execute(f'{verb} ROLE "{role}" LOGIN PASSWORD {literal}')
            cur.execute(f'GRANT CONNECT ON DATABASE "{database}" TO "{role}"')
            cur.execute(f'GRANT USAGE ON SCHEMA public TO "{role}"')
            cur.execute(f'ALTER ROLE "{role}" SET default_transaction_read_only = on')
            cur.execute(f'ALTER ROLE "{role}" SET statement_timeout = \'3s\'')
        if not grant_readonly():
            raise CommandError("could not grant table access (run migrate first)")
        self.stdout.write(self.style.SUCCESS(f"read-only role {role} ready"))
