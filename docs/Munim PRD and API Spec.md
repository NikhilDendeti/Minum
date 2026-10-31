# Munim PRD and API Spec

Oct 28, 2026 · @Giggy

## Product summary

Munim is a voice-first AI business partner for a Paytm merchant: it speaks a daily briefing in the merchant's language, answers questions from their own transaction data, forecasts cash flow and offers pre-approved credit before a gap, and proposes growth actions that run only after the merchant says yes. This spec covers the hackathon prototype (Team Versa, Track 1: Merchant Growth AI); the companion [Munim Build Plan](https://claude.ai/artifact/AmyLgErzdHEVNFgqVf3Yj3) covers timeline, demo script and risks.

**Goals of the prototype**

1. A spoken Hindi or Telugu question gets a spoken, correct, data-grounded answer in under 5 seconds.
2. Every number the agent says is traceable to a SQL query shown in the UI.
3. A cash-flow gap is predicted and a credit offer appears before it, approvable by tap or voice.
4. A growth action is proposed, approved by voice and marked sent.
5. One command (`make demo`) brings the whole thing up on a fresh clone.

**Non-goals** (do not build): real Paytm APIs or data, a real SMS gateway (the login code is simulated), actual message delivery or disbursal, inventory or GST, Soundbox firmware, mobile native app, async Django or WebSockets, automated tests beyond a smoke script.

## Update: login, several merchants and several languages

Added after the first version of this spec (details in `docs/IMPLEMENTATION_PLAN.md`, section 10):

- **Login:** mobile number + one-time code, signed session cookie (HttpOnly, CSRF-protected). New endpoints `POST /api/auth/request-otp`, `POST /api/auth/verify`, `POST /api/auth/logout`, `GET /api/auth/demo-accounts` (demo mode only), `GET|PATCH /api/me`. Every other `/api/` endpoint and every `/media/` file returns 401/404 without a session. In `DEMO_MODE` the code is `123456` and is shown on the login screen.
- **Several merchants:** `merchant_id = 1` is gone. Every query is scoped to the logged-in merchant; the agent's read-only SQL role is fenced by Postgres row-level security (`app.merchant_id`). `seed_demo` creates Lakshmi Kirana (te-IN, the planted stories) and Sharma Provision Store (hi-IN, plain data).
- **Languages:** English, Hindi and Telugu. Each merchant has a saved language (`PATCH /api/me {"language": "hi-IN"}`) that drives the UI, the spoken answers and the briefing; a spoken question in another supported language is answered in that language. One JSON catalog per language on each side (`backend/apps/i18n/locales`, `frontend/src/locales`); adding a language is a new file plus a Sarvam speech test.

## User and demo persona

The prototype serves exactly one merchant, hard-coded as `merchant_id = 1`, and the whole UI is her phone.

| Field | Value |
| --- | --- |
| Merchant | Lakshmi Kirana, grocery store, Kukatpally, Hyderabad |
| Owner | Lakshmi, 42, speaks Telugu first and Hindi second, reads little English |
| Devices | Android phone with Paytm for Business, Paytm Soundbox on the counter |
| Volume | \~90 transactions a day, average ticket ₹185, open 7 am to 10 pm |
| Demo date | `DEMO_TODAY = 2026-11-12` (constant; change in one place) |
| Language setting | `MERCHANT_LANGUAGE = te-IN` (switch to `hi-IN` for a Hindi demo) |

What she needs from Munim, in her words: "Kal kitna hua?" (how much yesterday), "settlement kam kyun?" (why is the settlement short), "paise kab tak chalenge?" (how long will the cash last), "purane customer wapas kaise aayenge?" (how do I bring regulars back).

## Feature requirements

Seven features, each with the acceptance test a judge could run. P0 must work live; P1 may be simulated or static if time runs out.

| ID | Feature | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| F1 | **Daily voice briefing.** Pre-generated at startup for `DEMO_TODAY`: yesterday's earnings vs the 4-week same-weekday average, slow hours, repeat-customer share, one alert. Spoken via the Soundbox panel and shown on Home. | P0 | Pressing the Soundbox plays audio within 1 s; text matches the numbers from `kpi_summary`; available in `te-IN` and `hi-IN`. |
| F2 | **Ask Munim (voice).** Press-and-hold mic, STT, agent answer grounded in SQL, TTS reply, transcript and answer shown, SQL panel expandable. | P0 | "Mera settlement kam kyun aaya?" returns ₹1,420 with the refund and MDR breakdown; the SQL panel shows the query and rows; first audio within 5 s. |
| F3 | **Ask Munim (text).** Same as F2 with a text box; used as the fallback and for judges who type. | P0 | Typed question returns the same answer and SQL as the spoken one. |
| F4 | **Cash-flow forecast and credit offer.** 14-day projection of net balance (inflows minus obligations), gap day highlighted, pre-approved offer card with amount and tenure, Approve / Not now. | P0 | Chart shows balance below zero on day +7; offer of ₹30,000 appears; Approve flips the offer to `approved` and the balance line updates. |
| F5 | **Growth proposal with approval.** Lapsed repeat-customer segment, promo text drafted in the merchant's language, Approve / Edit / Reject by tap, Approve / Reject by voice. | P0 | 40 lapsed customers found; saying "avunu" or "haan" within 4 s marks the offer `sent`; "kaadu" or "nahi" marks it `rejected`. |
| F6 | **Grounding and transparency.** Every spoken number comes from a tool result; the English draft, the rendered reply and the SQL are stored and viewable. | P0 | No numeric token in the reply is absent from the tool outputs of that turn (checked by a unit test on the three scripted questions). |
| F7 | **Soundbox simulation.** A device panel beside the phone with a chime and the briefing audio; labelled as a simulation. | P1 | Panel renders, button plays chime then briefing; tooltip reads "Simulated Soundbox". |

Out of scope for all features: editing the merchant's data, any screen the demo script does not visit, and anything that would require a Paytm production credential.

## Data model (Django, `apps/core/models.py`)

Six models, all in PostgreSQL; amounts are `DecimalField(12, 2)` in rupees, times are timezone-aware in `Asia/Kolkata`. The agent's `run_sql` reads these tables through a second `DATABASES` alias (`readonly`) whose Postgres role has `SELECT` only.

| Model | Table | Fields | Notes |
| --- | --- | --- | --- |
| `Merchant` | `merchants` | `id`, `name`, `category`, `city`, `language` (`te-IN`/`hi-IN`), `onboarded_on` | One row |
| `Transaction` | `transactions` | `id`, `merchant` FK, `ts`, `amount`, `customer_hash` (char 16), `mode` (`upi`/`card`/`wallet`), `status` (`success`/`refund`/`failed`), `settlement` FK nullable | Index on `(merchant, ts)`; \~16,000 rows |
| `Settlement` | `settlements` | `id`, `merchant` FK, `date`, `gross`, `mdr_fee`, `refunds`, `chargebacks`, `net`, `credited_on` | `net = gross - mdr_fee - refunds - chargebacks`; one per business day |
| `Customer` | `customers` | `customer_hash` PK, `merchant` FK, `first_seen`, `last_seen`, `visit_count`, `total_spend` | Derived table, rebuilt by `seed_demo` |
| `Obligation` | `obligations` | `id`, `merchant` FK, `label`, `amount`, `due_on`, `paid` bool | Supplier payment, rent, EMI |
| `Offer` | `offers` | `id`, `merchant` FK, `type` (`credit`/`promo`), `payload` JSON, `status` (`proposed`/`approved`/`rejected`/`sent`), `created_at`, `decided_at`, `decided_via` (`tap`/`voice`) | Written by the Growth and Cash-Flow agents; the only table the app writes at runtime |
| `Conversation` | `conversations` | `id`, `merchant` FK, `ts`, `transcript`, `language`, `intent`, `agent`, `sql` text, `rows` JSON, `answer_en`, `answer_local`, `latency_ms` | One row per `/ask`; powers the SQL panel and the judge's audit |

`seed_demo` (management command) truncates all seven tables, regenerates 6 months ending `DEMO_TODAY - 1` with `numpy.random.default_rng(42)`, plants the five stories from the build plan, rebuilds `customers`, and prints a verification line per story ("Story 3: settlement 2026-11-09 short by 1420.00"). It must finish in under 10 seconds.

Schema description for the LLM lives in `apps/tools/schema.md`: table and column names, types, one line of meaning each, and five example questions with their SQL. Keep it under 1,500 tokens.

## API contract (Django REST Framework, `/api/`)

Seven endpoints, JSON in and out except audio, no auth (single merchant), CORS open to `http://localhost:5173`. Errors return `{"error": {"code": "...", "message": "..."}}` with 4xx/5xx; the frontend shows `message` in the merchant's language when `message_local` is present.

| Method | Path | Purpose | Feature |
| --- | --- | --- | --- |
| GET | `/api/briefing` | Cached daily briefing text + audio URL | F1 |
| POST | `/api/ask` | Voice or text question → grounded answer + audio | F2, F3, F6 |
| GET | `/api/forecast` | 14-day cash-flow projection + credit offer | F4 |
| GET | `/api/growth` | Lapsed-customer segment + promo proposal | F5 |
| POST | `/api/offers/{id}/decide` | Approve or reject an offer by tap or voice | F4, F5 |
| GET | `/api/conversations/{id}` | Full audit of one turn (SQL, rows, drafts) | F6 |
| POST | `/api/reset` | Re-run `seed_demo` between judge rounds | — |

**GET `/api/briefing`** → 200

```json
{
  "date": "2026-11-12",
  "language": "te-IN",
  "text_local": "...",
  "text_en": "Yesterday you earned Rs 8,200, 12% lower than usual for a Tuesday. Evenings 6-9 pm are slow. 40 regular customers haven't visited in two weeks.",
  "audio_url": "/media/briefing_te-IN.mp3",
  "kpis": {"yesterday": 8200, "baseline": 9320, "delta_pct": -12.0, "slow_window": "18:00-21:00", "repeat_share_pct": 55, "lapsed_regulars": 40},
  "alerts": [{"type": "settlement_short", "offer_id": null, "text_local": "..."}, {"type": "cash_gap", "offer_id": 17, "text_local": "..."}]
}
```

**POST `/api/ask`** — `multipart/form-data` with either `audio` (webm/ogg/wav, ≤ 30 s, the most Sarvam transcribes in one request) or `text`; optional `language` (`te-IN`/`hi-IN`/`auto`, default `auto`). → 200

```json
{
  "conversation_id": 311,
  "transcript": "மेरा settlement कम क्यों आया?",
  "language": "hi-IN",
  "intent": "question",
  "agent": "insights",
  "answer_local": "...",
  "answer_en": "Your 9 Nov settlement was Rs 1,420 short of gross: Rs 890 in two refunds and Rs 530 in card fees.",
  "audio_url": "/media/answers/311.mp3",
  "evidence": {"sql": "SELECT ...", "rows": [{"date": "2026-11-09", "gross": 9870, "refunds": 890, "mdr_fee": 530, "net": 8450}], "tool": "run_sql"},
  "proposal": null,
  "latency_ms": {"stt": 900, "agent": 2400, "tts": 800}
}
```

When the router sends the question to the Growth or Cash-Flow agent, `proposal` is an offer object (same shape as in `/api/forecast`) and the frontend shows the approval card inline. Status 422 with `code: "no_speech"` when STT returns empty; 504 with `code: "llm_timeout"` after 10 s, in which case the frontend retries once with `fallback=true` (gpt-4o-mini).

**GET `/api/forecast`** → 200

```json
{
  "as_of": "2026-11-12",
  "days": [{"date": "2026-11-13", "inflow": 8900, "outflow": 0, "balance": 21400}, {"date": "2026-11-19", "inflow": 9100, "outflow": 0, "balance": -2300}],
  "gap": {"first_negative_date": "2026-11-19", "min_balance": -12800, "driver": {"label": "Supplier payment - Sri Balaji Traders", "amount": 45000, "due_on": "2026-11-21"}},
  "obligations": [{"id": 3, "label": "Supplier payment - Sri Balaji Traders", "amount": 45000, "due_on": "2026-11-21"}],
  "offer": {"id": 17, "type": "credit", "status": "proposed", "payload": {"amount": 30000, "tenure_days": 30, "basis": "15 x average daily net inflow (Rs 2,010), rounded", "text_local": "..."}}
}
```

`days` has exactly 14 entries. When the offer is approved, `balance` is recomputed with `+amount` on the approval date and `offer.status` is `approved`.

**GET `/api/growth`** → 200

```json
{
  "segment": {"name": "lapsed_regulars", "rule": "visit_count >= 5 AND last_seen < today - 14 days", "count": 40, "avg_monthly_spend": 1150},
  "offer": {"id": 18, "type": "promo", "status": "proposed", "payload": {"discount_pct": 10, "valid_days": 7, "channel": "paytm_app_notification", "text_local": "...", "text_en": "Lakshmi Kirana misses you! 10% off on your next visit this week.", "reach": 40}}
}
```

**POST `/api/offers/{id}/decide`** — body `{"decision": "approve" | "reject", "via": "tap" | "voice", "transcript": "avunu"}` → 200

```json
{"id": 18, "status": "sent", "decided_at": "2026-11-12T10:14:03+05:30", "decided_via": "voice", "confirmation_local": "...", "confirmation_en": "Done. The offer went to 40 regular customers.", "audio_url": "/media/answers/312.mp3", "simulated": true}
```

Approving a `credit` offer sets `status: "approved"`; approving a `promo` sets `status: "sent"` (the executor stub runs immediately). `simulated: true` is always present and the UI shows a small "simulated" tag. Voice decisions are matched server-side against `YES_WORDS = [haan, ha, yes, avunu, sari, theek hai, ok]` and `NO_WORDS = [nahi, na, no, kaadu, ledu, mat]` after lowercasing; an unmatched transcript returns 422 `code: "undecided"` and the UI asks again.

**GET `/api/conversations/{id}`** → the stored `Conversation` row: transcript, intent, agent, `sql`, `rows`, `answer_en`, `answer_local`, `latency_ms`. Used by the SQL panel and for the judge who asks "show me how it got that".

**POST `/api/reset`** → 200 `{"seeded": true, "seconds": 6.2, "stories": ["...", "..."]}`. Re-runs `seed_demo`, clears `conversations` and `offers`, regenerates the briefing cache. Guard it behind `DEMO_MODE=true`.

## Agent and tool contracts (`apps/agents/`, `apps/tools/`)

One LangGraph `StateGraph` with a typed state, five nodes and one interrupt. Tools are plain Python functions with the signatures below; the LLM sees them as function-calling tools, the Django views call them directly where no reasoning is needed (forecast, growth).

**Graph state** (`TypedDict`): `merchant_id`, `transcript`, `language`, `intent`, `agent`, `tool_calls: list[{name, args, result}]`, `answer_en`, `answer_local`, `proposal: Offer | None`, `approved: bool | None`, `error`.

**Nodes and edges:** `router` → one of `insights` / `cashflow` / `growth` → `render` (translate to the merchant's language) → END for answers; for proposals `render` → `approval` (`interrupt()`) → `execute` → `render` → END. `approval` resumes when `/api/offers/{id}/decide` calls `graph.update_state(thread_id, {"approved": ...})`; `thread_id` is the offer id.

| Tool | Signature | Returns | Used by |
| --- | --- | --- | --- |
| `run_sql` | `run_sql(query: str) -> {columns, rows, row_count}` | Executes on the `readonly` alias; rejects anything not starting with `SELECT`; 50-row cap; 3 s statement timeout | Insights |
| `kpi_summary` | `kpi_summary(day: date) -> {earned, baseline_4wk_same_weekday, delta_pct, peak_window, slow_window, txn_count, repeat_share_pct, lapsed_regulars}` | Pure ORM, no LLM; the source of the briefing | Insights, briefing job |
| `explain_settlement` | `explain_settlement(date: date) -> {gross, mdr_fee, refunds, chargebacks, net, shortfall, refund_txns: [...]}` | Shortcut for the most common question so it never depends on generated SQL | Insights |
| `forecast` | `forecast(days: int = 14) -> {days: [...], gap, driver}` | Same-weekday mean of the last 8 weeks for inflow, obligations as outflow, cumulative balance from current net position | Cash-Flow, `/api/forecast` |
| `credit_eligibility` | `credit_eligibility() -> {eligible, amount, tenure_days, basis}` | `amount = round(15 × avg_daily_net_90d, -3)`, capped at 50,000, eligible if 90-day history exists and no failed settlements | Cash-Flow |
| `segment_customers` | `segment_customers(rule: str = "lapsed_regulars") -> {count, customers: [...], avg_monthly_spend}` | ORM query: `visit_count >= 5 and last_seen < DEMO_TODAY - 14` | Growth |
| `draft_promo` | `draft_promo(segment, language) -> {discount_pct, valid_days, text_en, text_local}` | One LLM call with a fixed template; discount from `{5, 10}` only | Growth |
| `send_promo` / `disburse_credit` | `(offer_id) -> {status, simulated: True}` | Stubs that update `Offer.status` and write a log line | Executor |

**Prompts** (files in `apps/agents/prompts/`, English, under 400 tokens each):

- `router.md`: classify into `briefing | question | forecast | growth | approval | other`; detect language; output JSON only.
- `insights.md`: "You are Munim, an accountant for a small Indian shop. Answer only from tool results. Never state a number that is not in a tool result. Prefer `explain_settlement` and `kpi_summary`; write SQL only for other questions, using the schema below. Reply in 2–4 short sentences in English with rupee amounts as integers." + `schema.md`.
- `render.md`: translate the English answer into `{language}` as a shopkeeper's trusted accountant would speak, informal and warm, numbers written in words for TTS ("aath hazaar do sau"), no English words except brand names.
- `promo.md`: draft a 25-word promo in `{language}` for the segment; include the discount and validity; no emojis.

**Grounding check** (unit test in `apps/agents/tests.py`): for each scripted question, every integer in `answer_en` must appear in some `tool_calls[*].result`. Run it in `make demo` so a regression is caught before the pitch.

**Timeouts and fallback:** every LLM call `timeout=10`; on timeout or 5xx retry once on `LLM_FALLBACK_MODEL` (`gpt-4o-mini`). Cache keyed on normalised transcript for the three scripted questions; cache hits skip the LLM but still run the tools so the SQL panel is real.

## Frontend spec (React 18 + Vite + TypeScript + Tailwind)

One route, one page: a 390×844 phone frame on the left with four tab screens, and a Soundbox panel on the right. State lives in a single `useMunim()` hook (React context); no router, no Redux. Colours: `--paytm-blue #00BAF2`, `--navy #002E6E`, `--bg #FBFCFE`, `--ink #3D4A5C`; font Inter or DM Sans. Every label the merchant reads is in `MERCHANT_LANGUAGE`; developer labels (tab names in the code, the SQL panel header) may stay English.

**Screens**

| Screen | Route/tab | Components | API calls | States |
| --- | --- | --- | --- | --- |
| Home | `home` | `EarningsCard` (yesterday vs baseline, delta badge), `MunimSaysCard` (briefing text, play button), `AlertCard` × n (links to Cash flow or Grow) | `GET /api/briefing` on mount | loading, ready, error |
| Ask Munim | `ask` | `ChatThread` (bubbles), `MicButton` (press-and-hold, pulsing ring, 20 s cap), `TextInput` (fallback), `SqlPanel` (collapsed by default; shows `evidence.sql` and a rows table), `ProposalCard` when `proposal` is present | `POST /api/ask` (multipart) | idle, recording, transcribing (shows transcript as soon as returned), thinking, speaking, error |
| Cash flow | `cash` | `BalanceChart` (14-day line, zero line, gap shaded, built with Recharts), `ObligationList`, `OfferCard` (credit: amount, tenure, basis, Approve / Not now) | `GET /api/forecast` on tab open; `POST /api/offers/{id}/decide` | ready, approving, approved |
| Grow | `grow` | `SegmentCard` (count, rule in plain words), `PromoCard` (text\_local, editable textarea on Edit, Approve / Reject), `VoiceApprove` (4 s listen, shows heard word) | `GET /api/growth` on tab open; `POST /api/offers/{id}/decide` | proposed, listening, sent, rejected |
| Soundbox panel | beside the phone | `SoundboxDevice` (speaker grille, one blue button, LED), plays `chime.mp3` then `briefing.audio_url` | none (uses briefing state) | idle, playing |

**Shared components:** `PhoneFrame`, `TabBar` (Home, Ask, Cash, Grow with icons), `AudioPlayer` (single hidden `<audio>` element reused for every clip, so autoplay is unlocked once), `SimulatedTag` (small grey pill reading "simulated"), `Spinner` with a 6-second cap before showing partial text.

**`useMunim()` state:** `briefing`, `thread: Turn[]`, `forecast`, `growth`, `offers: Record<id, Offer>`, `audioState`, `error`. Actions: `ask(audioBlob | text)`, `decide(offerId, decision, via, transcript?)`, `playBriefing()`, `reset()`.

**Audio capture:** `navigator.mediaDevices.getUserMedia({audio: {sampleRate: 16000, channelCount: 1}})`, `MediaRecorder` with `audio/webm;codecs=opus`, start on `pointerdown`, stop on `pointerup` or at 20 s, then `POST` the blob. Show the waveform or a pulsing ring while recording; show the transcript the moment `/api/ask` returns (the answer and audio arrive in the same response, so play immediately).

**Voice approval:** `VoiceApprove` records up to 4 s, posts to `/api/offers/{id}/decide` with `via: "voice"` and the raw audio as `transcript_audio` (server runs STT and matches words). On 422 `undecided`, show "Didn't catch that, try again" in the merchant's language.

**Error handling:** every API error shows a one-line toast in the merchant's language and leaves the previous screen state intact; the mic button never disappears. A `?demo=1` query param shows a tiny reset button (calls `/api/reset`) in the corner for use between judge rounds.

## Configuration and non-functional requirements

Everything that can change on the day is an environment variable; nothing demo-specific is hard-coded in views.

```markdown
# .env.example
DJANGO_SECRET_KEY=change-me
DEBUG=true
DEMO_MODE=true
DEMO_TODAY=2026-11-12
MERCHANT_LANGUAGE=te-IN            # or hi-IN
DATABASE_URL=postgres://munim:munim@localhost:5432/munim
READONLY_DATABASE_URL=postgres://munim_ro:munim_ro@localhost:5432/munim
LLM_MODEL=gpt-4o
LLM_FALLBACK_MODEL=gpt-4o-mini
OPENAI_API_KEY=
SPEECH_PROVIDER=sarvam              # sarvam | openai | prerecorded
SARVAM_API_KEY=
SARVAM_TTS_SPEAKER=meera            # pick one Bulbul voice and keep it
LLM_TIMEOUT_S=10
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

| Requirement | Target | How it is met |
| --- | --- | --- |
| Answer latency (end of speech to first audio) | ≤ 5 s p50, ≤ 8 s p95 | One STT call, at most two LLM calls, one TTS call; cached scripted answers; gpt-4o-mini fallback |
| Briefing playback | ≤ 1 s | Generated at startup by a `post_migrate` hook or `make demo` step; MP3 served from `/media` |
| Reset between judge rounds | ≤ 10 s | `seed_demo` with vectorised `numpy` generation and `bulk_create(batch_size=5000)` |
| Cold start on a fresh clone | ≤ 5 min with Docker cached | `make demo` = `docker compose up -d db`, `pip install -r requirements.txt`, `migrate`, `seed_demo`, `generate_briefing`, `runserver` + `npm run dev` |
| Offline resilience | Demo survives API outage | `SPEECH_PROVIDER=prerecorded` serves MP3s from `assets/` keyed by scripted question id; LLM cache serves the three scripted answers |
| Security (hackathon level) | No write path from the LLM | `run_sql` uses the `readonly` role; `/api/reset` only when `DEMO_MODE=true`; keys only in `.env`, never committed |
| Logging | Every turn auditable | `Conversation` row per `/api/ask`; structured log line per tool call with latency |
| Browser support | Chrome desktop | Autoplay unlocked by the first click; `MediaRecorder` with Opus |

Python 3.11, Django 5.1, djangorestframework 3.15, django-cors-headers, psycopg\[binary\], langgraph, openai, sarvamai, pandas, numpy, python-dotenv. Node 20, React 18, Vite 5, Tailwind 3, Recharts 2.

## Build order and definition of done

Build in the order a judge will test it: data, then the one question that must work, then voice, then the two proposal flows, then the shell. Each step has a check you can run before moving on.

- [ ] **1. Data.** Django project, models, migrations, `seed_demo`, `readonly` role. Check: `python manage.py seed_demo` prints five story lines; `SELECT net FROM settlements WHERE date='2026-11-09'` shows the ₹1,420 shortfall.
- [ ] **2. Tools.** `kpi_summary`, `explain_settlement`, `forecast`, `credit_eligibility`, `segment_customers`, `run_sql`. Check: each returns the planted numbers from a Django shell.
- [ ] **3. Insights path, text only.** Router + Insights + `render`, `POST /api/ask` with `text`. Check: the three scripted questions return correct `answer_en` and `evidence.sql`; grounding test passes.
- [ ] **4. Voice.** Sarvam STT/TTS wrappers, `audio` upload, MP3 in response, `/api/briefing` with cached audio. Check: `curl -F audio=@q1.webm /api/ask` returns an `audio_url` that plays a correct Hindi answer.
- [ ] **5. Frontend core.** PhoneFrame, TabBar, Ask screen with MicButton, ChatThread, SqlPanel, AudioPlayer. Check: spoken question to spoken answer in the browser, SQL panel shows the query.
- [ ] **6. Cash flow.** `/api/forecast`, BalanceChart, OfferCard, `/api/offers/{id}/decide` by tap; LangGraph `interrupt()` wired. Check: gap on day +7, offer approved, line updates.
- [ ] **7. Growth.** `/api/growth`, `draft_promo`, PromoCard, VoiceApprove with word matching. Check: "avunu" marks the offer sent; "kaadu" rejects.
- [ ] **8. Home and Soundbox.** EarningsCard, MunimSaysCard, AlertCards, SoundboxDevice with chime. Check: Soundbox plays within 1 s on first click.
- [ ] **9. Resilience.** LLM timeout and gpt-4o-mini fallback, scripted-answer cache, `SPEECH_PROVIDER=prerecorded`, `/api/reset`, `?demo=1` reset button. Check: pull the network for 30 s mid-demo and the scripted path still completes.
- [ ] **10. Package.** `make demo`, README with real-vs-simulated table and architecture image, `.env.example`, demo video, fresh-clone test on a second machine.

**Definition of done:** on a fresh clone with `make demo`, a judge can press the Soundbox and hear the briefing, speak "mera settlement kam kyun aaya" and hear ₹1,420 explained with the SQL on screen, approve a ₹30,000 credit offer against a visible day-7 gap, and send a Telugu promo to 40 lapsed regulars by saying "avunu"; the whole sequence runs in under 2½ minutes, twice in a row, with `/api/reset` between runs.
