<img src="assets/logo/munim-logo.svg" alt="Munim" height="56">

**A voice-first AI business partner for a Paytm merchant.** Munim speaks a daily briefing in the merchant's language, answers questions from her own transaction data (every number traceable to a SQL query on screen), forecasts cash flow and offers pre-approved credit *before* a gap, and proposes growth actions that only run after she says yes.

Team Versa · Nikhil · Track 1: Merchant Growth AI. The prototype serves one synthetic merchant, Lakshmi Kirana (Kukatpally, Hyderabad).

Docs: [`docs/Munim PRD and API Spec.md`](docs/Munim%20PRD%20and%20API%20Spec.md) · [`docs/Munim Build Plan.docx`](docs/Munim%20Build%20Plan.docx) · [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)

## Real vs simulated

| Real (built and running) | Simulated (labelled in the UI) |
| --- | --- |
| Synthetic data pipeline with five planted stories (seed 42) | Paytm production data and APIs (the data is synthetic) |
| SQL-grounded answers on a read-only Postgres role | The promo send and the credit disbursal (`simulated: true`) |
| LangGraph router, three agents, `interrupt()` approval gate | The Soundbox hardware (an on-screen device plays the audio) |
| Cash-flow forecast and the credit rule | |
| Speech in and out (Sarvam, OpenAI fallback), voice yes/no approval | |

## Architecture

```
React (responsive web app + Soundbox)  ->  Django REST  ->  LangGraph
                                                    router -> insights | cashflow | growth -> render
                                                              proposals: approval (interrupt) -> execute -> confirm
Speech: Sarvam Saarika / Bulbul  (fallback: OpenAI, then pre-recorded clips)
LLM:    GPT-4o  (retried once on gpt-4o-mini)
Data:   PostgreSQL 16, tools read it through a SELECT-only role
```

Grounding: the LLM never produces a number. It calls tools (`run_sql`, `kpi_summary`, `explain_settlement`), a check rejects any number in the draft that no tool returned, the English draft and the SQL are stored per turn (`GET /api/conversations/{id}`), and Hindi amounts are turned into words by code, not by the model.

## Run it

Needs Docker Desktop, Python 3.11 to 3.13, Node 20+.

```powershell
# Windows (make is not installed by default); add -NoStart to run setup, tests and smoke without launching the servers
powershell -ExecutionPolicy Bypass -File scripts\demo.ps1
```

```bash
# macOS / Linux
cp .env.example .env        # add OPENAI_API_KEY and SARVAM_API_KEY
make demo
```

`make demo` starts Postgres, installs dependencies, migrates, seeds, pre-generates the briefing, runs the tests and the smoke script, then starts the backend (http://localhost:8010) and the frontend (http://localhost:5173).

Without API keys everything still works as text: scripted questions are answered from fixed templates (tools still run), and the suggested-question buttons replace the mic. Add keys for voice and for free-form questions.

Open `http://localhost:5173/?demo=1` for the reset button (or `POST /api/reset`; it needs `DEMO_MODE=true`).

### Sign in and languages

Sign in with a mobile number and a one-time code. In demo mode the code is `123456` (shown on screen) and the login page has one-tap demo accounts:

| Merchant | Phone | Language | Data |
| --- | --- | --- | --- |
| Lakshmi Kirana, Hyderabad | 9876500001 | Telugu | the five planted stories |
| Sharma Provision Store, Delhi | 9876500002 | Hindi | plain data, no cash gap |
| Sai Ram Medicals, Mumbai (pharmacy) | 9876500003 | Hindi | big tickets, card-heavy, month-start peak, no cash gap |
| Venkat Tiffins & Tea, Secunderabad | 9876500004 | Telugu | tiny tickets, breakfast rush, cash gap on day 8 and a credit offer |
| Glow Unisex Salon, Bengaluru | 9876500005 | English | weekend-heavy, long gaps between visits, no cash gap |
| Raju Fresh Vegetables, Hyderabad | 9876500006 | Telugu | early market hours, Sunday and festival spikes, cash gap on day 6 and a credit offer |

Lakshmi and Sharma are generated exactly as before, so the planted stories never move; the other four exercise the product on data it was not tuned for. `python manage.py check_seed` (also run on every seed) checks every merchant: settlements balance, visit counts match transactions, ticket sizes and regular-customer shares sit in range, sales stay inside opening hours, and no customer is shared between merchants.

Each merchant only ever sees their own data (every query is scoped to the session, and the agent's SQL is fenced by Postgres row-level security). Switch the language in the header (English, Hindi, Telugu); it changes the UI, spoken answers, offers and briefing, and is saved to the profile. Adding a language is one catalog file on each side (see `docs/IMPLEMENTATION_PLAN.md`, section 10).

| Command | What it does |
| --- | --- |
| `make seed` / `make reset` | Regenerate data for all six merchants (about 20 s); `reset` also rebuilds the briefing |
| `make test` | Backend tests: stories, `run_sql` guard, voice words, grounding |
| `make smoke` | Hits every endpoint in-process and checks the planted numbers |
| `make record-fallbacks` | Record offline audio into `assets/fallback/` (run once while online) |

Offline mode: set `SPEECH_PROVIDER=prerecorded` after `make record-fallbacks`.

## The planted stories

1. Weekday evenings (6-9 pm) sell about 35% less than the 11 am to 1 pm peak.
2. Yesterday (Wed 11 Nov) earned ₹8,200, 12% below the 4-week Wednesday average of ₹9,320.
3. The 9 Nov settlement is ₹1,420 short of gross: ₹890 in two refunds, ₹530 in fees.
4. 40 regular customers (5+ visits) have not been back in 14+ days.
5. Cash goes below zero on 19 Nov (a ₹45,000 supplier payment); a pre-approved ₹30,000 credit offer covers it.

## Where the build differs from the PRD

- Ports: Postgres on 5433 and the backend on 8010, to avoid clashing with other local projects.
- Supplier payment is due day +7 (not +9), average ticket is about ₹103, and the credit rule uses an operating-cost ratio so the numbers reconcile (see section 1 of the implementation plan).
- The customers table has about 2,800 rows (not 1,400) so that no casual customer reaches 5 visits and the lapsed-regular count is exactly 40.
- LLM calls use the `openai` SDK directly, OpenAI only (no Groq); a timed-out gpt-4o call is retried once on gpt-4o-mini. The approval checkpoint is a SQLite file.
- Telugu number words are left to the TTS provider (digits are passed through); Hindi numbers are converted to words in code.
- Telugu and Hindi wording in `apps/agents/templates.py` and `frontend/src/lib/i18n.ts` needs a native-speaker review.
- Speech runs on Sarvam's `sarvamai` SDK with `saaras:v3` (speech-to-text) and `bulbul:v3` + speaker `ritu` (text-to-speech, which speaks Telugu, Hindi and English). `bulbul:v2` is deprecated. Model and speaker names are env settings; the first real calls confirmed them (see `scripts/sarvam_first_call.py`). Browser-recorded WebM from the microphone has not been tried yet.
