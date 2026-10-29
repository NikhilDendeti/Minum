# Deploying Munim on Railway

Three Railway services from this one repo: **Postgres**, **backend** (Django + gunicorn) and **frontend** (the React app
served by Caddy, which also proxies `/api` and `/media` to the backend).

Why the frontend proxies: the login is a session cookie. Two `*.up.railway.app` domains are different sites, so the
browser would not send the cookie from one to the other. Behind one public domain it just works, and the backend
stays private.

Both Docker builds were tested locally (login, CSRF, a question, the approval gate and audio all worked through the
proxy). The Railway steps below were not run from here: check the setting names against Railway's UI.

## 1. Postgres
New → Database → PostgreSQL. Nothing else to do; the backend creates its read-only role on every start
(`ensure_readonly_role`).

## 2. Backend service
New → GitHub repo → this repo. In the service **Settings**:
- Root Directory: leave as `/` (the build needs the repo root for `assets/`)
- Variable `RAILWAY_DOCKERFILE_PATH` = `backend/Dockerfile`
- **Volume**: add one, mount path `/data` (keeps audio, cached briefings and paused approvals across deploys)
- Networking: do **not** generate a public domain (the frontend reaches it privately)

Variables (set in Railway; never commit them):

| Variable | Value |
| --- | --- |
| `PORT` | `8000` |
| `DEBUG` | `false` |
| `DJANGO_SECRET_KEY` | a long random string, e.g. `python -c "import secrets;print(secrets.token_urlsafe(50))"` |
| `DEMO_MODE` | `true` for a judges' demo (login code shown on screen, `/api/reset` and demo seeding allowed); `false` otherwise |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `READONLY_DATABASE_URL` | `postgresql://munim_ro:<choose-a-password>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |
| `OPENAI_API_KEY` | your key |
| `SARVAM_API_KEY` | your key |
| `SPEECH_PROVIDER` | `sarvam` |
| `MEDIA_ROOT` | `/data/media` |
| `LANGGRAPH_DB` | `/data/langgraph.sqlite` |
| `ALLOWED_HOSTS` | the frontend's public domain (step 4), e.g. `munim-web.up.railway.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://munim-web.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://munim-web.up.railway.app` |

On start the container runs `migrate`, creates the read-only role, loads the demo data **only if the database is empty
and `DEMO_MODE` is true**, then starts gunicorn (one worker, four threads, 90 s timeout). Redeploys never wipe data.

## 3. Frontend service
New → GitHub repo → this repo again. In **Settings**:
- Root Directory: `frontend` (its `Dockerfile` is picked up automatically)

Variables:

| Variable | Value |
| --- | --- |
| `BACKEND_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8000` (use your backend service's name) |

## 4. Public domain and the last variables
1. Frontend service → Settings → Networking → **Generate Domain**.
2. Put that domain into the backend's `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` (with `https://`) and `CORS_ALLOWED_ORIGINS`, and redeploy the backend.
3. Open the frontend URL. The login page lists the two demo accounts (`DEMO_MODE=true`); the code is `123456`.

## Checks
- Backend deploy log should end with `Starting gunicorn` and `Listening at: http://[::]:8000`.
- `https://<frontend-domain>/api/health` returns `{"ok": true}`.
- The microphone works because Railway serves HTTPS (browsers block the mic on plain http).

## Things to know
- **One backend instance only.** The volume and the SQLite checkpoint file mean it can't be scaled out.
- **`DEMO_MODE=true` on a public URL** lets anyone sign in as the demo merchants and spend your OpenAI and Sarvam credits, and any signed-in user can press reset. Share the link only with judges, or switch it off afterwards.
- **Errors now appear in the deploy logs** (a 500 prints its traceback).
- To reload the demo data later: set `DEMO_MODE=true` and use the app's reset (`/?demo=1`), or run `python manage.py seed_demo` in a Railway shell.
- Local, no-Docker setup is unchanged: see the README.
