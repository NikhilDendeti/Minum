#!/bin/sh
# Container start: bring the database up to date, make sure the read-only role exists, load demo data on the very
# first deploy (only into an empty database), then serve with gunicorn.
#   One worker with threads: the paused-approval checkpoint is a single SQLite file and the LLM circuit-breaker
#   lives in memory. 90 s timeout because a spoken question can take 10+ s.
#   Binds to IPv6 ([::]) by default so Railway's private network can reach it; set BIND=0.0.0.0:8000 to override.
set -e
python manage.py migrate --noinput
python manage.py ensure_readonly_role
python manage.py seed_if_empty
exec gunicorn munim.wsgi:application \
  --bind "${BIND:-[::]:${PORT:-8000}}" \
  --workers 1 --threads 4 --timeout 90 \
  --access-logfile - --error-logfile -
