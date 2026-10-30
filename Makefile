ifeq ($(OS),Windows_NT)
PY := .venv/Scripts/python
else
PY := .venv/bin/python
endif

.PHONY: demo env db install migrate seed briefing smoke test reset record-fallbacks

# One command from a fresh clone: database, deps, data, briefing, checks, then both servers.
demo: env db install migrate seed briefing test smoke
	@echo "Backend  http://localhost:8010   Frontend http://localhost:5173"
	cd backend && ../$(PY) manage.py runserver 0.0.0.0:8010 --noreload & \
	cd frontend && npm run dev

env:
	@test -f .env || cp .env.example .env

db:
	docker compose up -d db
	docker compose exec -T db sh -c 'until pg_isready -U munim -d munim; do sleep 1; done'

install:
	@test -d .venv || python -m venv .venv
	$(PY) -m pip install -q -r backend/requirements.txt
	cd frontend && npm install --no-audit --no-fund

migrate:
	cd backend && ../$(PY) manage.py migrate

seed:
	cd backend && ../$(PY) manage.py seed_demo

briefing:
	cd backend && ../$(PY) manage.py generate_briefing

smoke:
	$(PY) scripts/smoke.py

test:
	cd backend && ../$(PY) manage.py test apps

# back to the start of the demo: reseed, drop offers/conversations, rebuild briefings (same as POST /api/reset)
reset:
	cd backend && ../$(PY) manage.py reset_demo

record-fallbacks:
	$(PY) scripts/record_fallbacks.py
