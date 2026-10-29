# Munim: Implementation Plan

Companion to `Munim PRD and API Spec.md` (what to build) and `Munim Build Plan.docx` (why, timeline, pitch).
This file is the single execution plan: decisions, build order, checks, and the resilience work that keeps the demo alive.

**Source-of-truth order when the docs disagree:** PRD/API Spec for anything technical, Build Plan for anything about the pitch, script, risks and Q&A. Section 1 lists every conflict found and the resolution this plan builds with.

---

## 1. Spec reconciliation (resolve before writing code)

Reading the two docs together turned up conflicts that would break the demo if built literally. Each row has a default; override any of them, but decide before step 1 (seed data).

| # | Conflict | Why it matters | Resolution used in this plan |
| --- | --- | --- | --- |
| R1 | `DEMO_TODAY = 2026-11-12` is a **Thursday**, so "yesterday" is a **Wednesday**. The PRD sample says "for a Tuesday". | Briefing would name the wrong weekday; judges check. | Weekday name is computed from the date, never typed. Baseline = the last 4 Wednesdays. Fix the PRD sample text. |
| R2 | 90 txns/day x ₹185 = ₹16,650/day, but the persona earns ₹8,200 to ₹9,320/day. | Seed totals would contradict every planted number. | Keep ~90 txns/day (≈16k rows) and set average ticket to **≈₹103**. Update persona text in the deck and README. |
| R3 | Credit rule is `15 x avg daily net inflow` and the PRD quotes ₹2,010/day, but forecast inflow is ₹8,900/day. A plain average of settlement net gives ≈₹133k, capped to ₹50k, not ₹30k. | Wrong offer amount. | Add `OPERATING_COST_RATIO = 0.774` (stock purchases and running costs as a share of sales). `net_daily = settlement_net x (1 - ratio) ≈ ₹2,010`. Credit = `round(15 x 2,010, -3) = 30,000`. The forecast uses the same split: inflow = same-weekday mean of settlement net; outflow = operating cost + obligations. |
| R4 | Build Plan: gap on day +7 **and** ₹45,000 supplier payment on day +9. With a positive daily net, a balance negative on day +7 would fall to roughly ₹-41k by day 9, which the ₹30k offer cannot cover. | Offer wouldn't actually solve the gap. | Supplier payment is due **day +7 (2026-11-19)**. Opening cash is calibrated so `min_balance ≈ -12,800`. Approving ₹30,000 lifts the minimum to ≈ +17,200. Script line "nine days early" becomes "a week early". |
| R5 | ₹530 "MDR on card transactions" is 5.4% of that day's ₹9,870 gross; card MDR is about 1.8%. | A judge opening the transactions would see it doesn't add up. | Seed enough card volume that day, or describe it as "card and processing fees" in the answer text. The spoken line says "fees", not "card fees". |
| R6 | Build Plan says `/approve`; PRD says `POST /api/offers/{id}/decide`. | Frontend and backend would disagree. | Use **`/decide`** (PRD). Update the Build Plan repo tree. |
| R7 | `decide` takes `transcript` (JSON) in the API contract but raw `transcript_audio` in the frontend section. | Voice approval wouldn't work end to end. | `decide` accepts JSON (tap, or a transcript string) **or** `multipart` with `audio` plus `via=voice`. Server runs STT, then matching. |
| R8 | Voice matching uses substrings of `ha`, `na`, `no`. `nahi` contains `ha`, so it would read as yes. STT also returns native script (हाँ, నహీ, అవును, కాదు), not romanised words. | The "kaadu / nahi" rejection demo fails. | Tokenise, match whole words only, **check NO before YES**, and include Devanagari and Telugu spellings in both lists. Unit-test all of them. |
| R9 | PRD says approval resumes with `graph.update_state(...)`. In current LangGraph, `interrupt()` resumes with `graph.invoke(Command(resume=...), config)`. An in-memory checkpointer is lost when `runserver` autoreloads. | Approval silently never resumes. | Use `Command(resume=...)`, a persistent checkpointer (Postgres saver, or SQLite file), and run the server with `--noreload` in `make demo`. Confirm the API in Phase 0. |
| R10 | PRD says "six models" then lists seven (adds `Conversation`). | Minor. | Seven models. Add `Merchant.cash_balance` (calibrated by the seed) as the forecast's opening position. |
| R11 | `/api/forecast` and `/api/growth` return an offer, but nothing says who creates it. | Each page load would create a new offer row. | Both views use `get_or_create` for the one open `proposed` offer per type; `/reset` clears them. |
| R12 | Briefing generated in a `post_migrate` hook calls LLM and TTS during `migrate`. | `migrate` fails offline. | Briefing generated only by `generate_briefing` (run in `make demo`), with `/api/briefing` regenerating lazily if the cache is missing. |
| R13 | Speech details are assumed: webm/opus accepted by Sarvam STT, TTS returns MP3, voice name `meera`. Sarvam model and voice names change between versions. | The voice step is the highest-risk integration. | Phase 0 spike (below) confirms formats and voices. If STT rejects webm, transcode client-side to WAV or server-side with `ffmpeg`. Treat TTS as "audio bytes plus a content type" rather than assuming MP3. |
| R14 | Team machine is Windows 11 with Python 3.13, the repo sits inside OneDrive, and `make` is not guaranteed. | `.venv`/`node_modules` in OneDrive sync slowly or corrupt; `make demo` may not exist. | Keep the repo outside OneDrive (or exclude it from sync). Provide `scripts/demo.ps1` alongside the Makefile. Prefer Python 3.11/3.12 and confirm 3.13 wheels in Phase 0. |
| R15 | Timeout and Groq fallback are specified server-side and again as a frontend retry with `fallback=true`. | Double retries blow the latency budget. | Server owns the fallback chain. The frontend retries only on network failure, once. |
| R16 | Settlements "one per business day" vs ~180 settlements over six months. | Weekend rows would be missing. | One settlement per **calendar day** (≈184 rows). |

---

## 2. Target repository layout

The repo root is this folder. `docs/` holds the two source documents and this plan.

```
README.md                  pitch, architecture image, real-vs-simulated table, run steps
Makefile                   demo | seed | reset | smoke | test
scripts/demo.ps1           Windows equivalent of `make demo`
docker-compose.yml         postgres:16 + init script for the read-only role
.env.example               from PRD section "Configuration"
docs/                      PRD, Build Plan, this plan
assets/                    briefing_te.mp3, briefing_hi.mp3, chime.mp3, fallback/<q_id>.mp3, demo.mp4, deck.pdf
backend/
  manage.py
  munim/                   settings.py (DATABASES: default + readonly), urls.py
  apps/core/               models.py, management/commands/{seed_demo,generate_briefing}.py
  apps/tools/              sql.py, kpi.py, settlement.py, forecast.py, credit.py, segments.py,
                           promo.py, executor.py, schema.md
  apps/agents/             graph.py, router.py, insights.py, cashflow.py, growth.py, render.py,
                           llm.py (timeout + fallback), cache.py, prompts/*.md, tests.py
  apps/speech/             base.py, sarvam.py, openai_speech.py, prerecorded.py
  apps/api/                views.py, serializers.py, urls.py
frontend/
  src/App.tsx, hooks/useMunim.ts, lib/api.ts, lib/audio.ts
  src/screens/{Home,Ask,CashFlow,Grow}.tsx
  src/components/{PhoneFrame,TabBar,AudioPlayer,SimulatedTag,Spinner,SoundboxDevice,
                  MicButton,SqlPanel,ChatThread,ProposalCard,EarningsCard,MunimSaysCard,
                  AlertCard,BalanceChart,ObligationList,OfferCard,SegmentCard,PromoCard,VoiceApprove}.tsx
```

---

## 3. Phase 0: accounts, environment and spikes (do first, about half a day)

Nothing below is optional; each item removes a risk that would otherwise surface on day D-4.

**Accounts and keys (fund them now)**
- OpenAI key (GPT-4o), Sarvam key (STT and TTS) (Groq was dropped: OpenAI only). Put them in `.env`; confirm `.env` is git-ignored.

**Environment**
- Docker Desktop running; `docker compose up -d db` works.
- Python 3.11 or 3.12 virtualenv (check 3.13 wheels for `psycopg[binary]`, `numpy`, `pandas`, `langgraph` first). Node 20. Chrome.
- Move or exclude the repo from OneDrive sync. Install `make` (or rely on `scripts/demo.ps1`).
- `ffmpeg` only if the STT spike shows webm is rejected.

**Spikes (each ends with a saved working snippet in `backend/apps/speech/` or `agents/`)**
1. **Sarvam STT:** send a 5-second Hindi and a 5-second Telugu WebM/Opus clip recorded in Chrome; record accepted formats, language-code behaviour (`unknown`/auto-detect), response shape, latency.
2. **Sarvam TTS:** one Hindi and one Telugu sentence containing a number written in words; note output format, sample rate, valid speaker names, latency. Pick **one** voice per language and keep it.
3. **LangGraph interrupt/resume:** a 20-line graph with `interrupt()`, a persistent checkpointer, resumed from a separate HTTP request via `Command(resume=...)`.
4. **Postgres read-only role:** confirm `run_sql` against the `readonly` alias cannot `INSERT`, `DROP`, or read other schemas, and that `statement_timeout` fires.
5. **Browser audio:** `MediaRecorder` on press-and-hold in Chrome, blob posted to a stub endpoint; autoplay unlocked after one click.

Exit criterion: all five spikes pass, and the answers to R9 and R13 are written into this file.

---

## 4. Build order (maps to the PRD's ten steps and the Build Plan's D-6 to D-0)

Each step ends with a runnable check. Do not start the next step until the check passes. With two people: **Backend** owns steps 1 to 4, 6 (API side), 7 (API side), 9; **Frontend** owns 5, 6 and 7 (UI side), 8, and the mock-JSON scaffold in parallel from D-6.

### Step 1: Data (D-6)
Tasks
- Django project, Postgres config, two `DATABASES` aliases; init SQL creating role `munim_ro` with `SELECT` only on the seven tables.
- Seven models and migrations (add `Merchant.cash_balance`; index `(merchant, ts)`).
- `seed_demo`: truncate, `numpy.default_rng(42)`, 6 months ending `DEMO_TODAY - 1` (≈184 days), vectorised generation, `bulk_create(batch_size=5000)`, rebuild `customers`, calibrate, **assert** and print one verification line per story. Must run in under 10 s.

Seed design (defaults from R1 to R5)

| Story | What the seed must produce | Assertion |
| --- | --- | --- |
| Base | ~90 txns/day, mean ticket ≈₹103, open 07:00 to 22:00, hourly curve with two peaks, Sunday +20%, Tuesday -10%, one festival spike date | row count 15,500 to 17,000 |
| 1 Evening slump | Weekday 18:00 to 21:00 volume 35% below the 11:00 to 13:00 peak (weekdays only) | ratio within 0.62 to 0.68 |
| 2 Yesterday's dip | Wed 2026-11-11 earned **₹8,200**; mean of previous four Wednesdays **₹9,320**; `delta_pct = -12.0` | exact |
| 3 Short settlement | Settlement 2026-11-09: gross 9,870, refunds 890 (two refund txns, for example 540 + 350), mdr_fee 530, chargebacks 0, net 8,450, credited 2026-11-10 | `gross - net = 1,420` |
| 4 Repeat customers | ~1,400 hashes; ~250 regulars (≈18%) produce ≈55% of revenue; **exactly 40** with `visit_count >= 5` and `last_seen < DEMO_TODAY - 14`; their avg monthly spend ≈₹1,150 | `count == 40` |
| 5 Cash crunch | Obligations ≈12 rows (past ones paid) plus Sri Balaji Traders ₹45,000 due **DEMO_TODAY + 7**, and rent/EMI rows elsewhere in the horizon; `cash_balance` calibrated so `min_balance ≈ -12,800`, first negative day +7 | `first_negative == 2026-11-19`, `credit amount == 30,000` |

Define "earned" once: sum of `success` transaction amounts for the day. `Settlement.gross` uses the same definition.

Check: `python manage.py seed_demo` prints five story lines and exits under 10 s; `SELECT gross - net FROM settlements WHERE date='2026-11-09'` returns 1420.00.

### Step 2: Tools (D-5)
- `run_sql`: single statement only (reject `;` followed by more text, comments that hide keywords), must start with `SELECT` or `WITH`, 50-row cap, 3 s statement timeout, executes on `readonly`; returns `{columns, rows, row_count}`. A failing query is retried **once** with the error appended, then the agent says it could not find it.
- `kpi_summary`, `explain_settlement` (pure ORM, no LLM), `forecast` (R3 model, 14 entries exactly, gap and driver), `credit_eligibility` (cap ₹50,000, eligibility rule from PRD), `segment_customers`, `draft_promo` (discount from `{5, 10}` only), `send_promo` / `disburse_credit` stubs.
- Write `apps/tools/schema.md` (<1,500 tokens, five example Q and SQL pairs).
- Structured log line per tool call with latency.

Check: from a Django shell, each tool returns the planted numbers (₹1,420 / 40 / ₹30,000 / day +7).

### Step 3: Insights path, text only (D-5)
- `llm.py`: one wrapper with `timeout=10`, retry once on `LLM_FALLBACK_MODEL` (gpt-4o-mini), logs latency.
- `router.md`, `insights.md`, `render.md` prompts; router returns JSON only (`briefing | question | forecast | growth | approval | other`) plus language.
- Insights prefers `explain_settlement` and `kpi_summary`; SQL only for other questions.
- `render` translates English to the merchant language, numbers spelled out for TTS.
- `POST /api/ask` with `text`; writes a `Conversation` row (draft, rendered, SQL, rows, latency).
- Answer cache keyed on a normalised transcript for the three scripted questions (three phrasings each). **Cache hits still run the tools** so the SQL panel is real.
- **Grounding test** (`agents/tests.py`): for each scripted question, extract every numeric token from `answer_en`, strip commas and `Rs`, ignore day-of-month tokens next to a month name, compare percentages by absolute rounded value, and require each to appear in some `tool_calls[*].result`. Fail loudly with the offending token.

Check: three scripted questions return correct `answer_en` and `evidence.sql`; grounding test is green.

### Step 4: Voice (D-4)
- `speech/` providers behind one interface (`transcribe(blob, lang)`, `synthesize(text, lang)`), selected by `SPEECH_PROVIDER` (`sarvam`, `openai`, `prerecorded`).
- `/api/ask` accepts `audio` (≤20 s, webm/ogg/wav), returns `audio_url`, `transcript`, `latency_ms {stt, agent, tts}`; 422 `no_speech` on empty STT.
- `generate_briefing`: runs `kpi_summary(DEMO_TODAY - 1)`, writes Telugu and Hindi text plus audio, caches them; `/api/briefing` serves the cache.
- Amount formatting helper: Indian digit grouping for display, words for TTS.
- Record fallback clips for the scripted questions while online: `make record-fallbacks` writes `assets/fallback/<q_id>.mp3`.

Check: `curl -F audio=@q1.webm http://localhost:8000/api/ask` returns an `audio_url` that plays a correct Hindi answer in under 5 s.

### Step 5: Frontend core (D-4)
- Vite + React 18 + TS + Tailwind; phone frame 390x844 labelled "Paytm for Business (prototype)"; `TabBar`; single `useMunim()` context; one reused `<audio>` element.
- Ask screen: `MicButton` (press-and-hold, pointer events, 20 s cap, pulsing ring), `TextInput`, `ChatThread`, `SqlPanel` (collapsed), 6 s spinner cap.
- Show the transcript the moment `/api/ask` returns, play the audio immediately.
- Toasts in the merchant's language; the mic never disappears; `?demo=1` shows the reset button.
- When `SPEECH_PROVIDER=prerecorded`, show tap-to-ask chips for the scripted questions (the mic cannot be transcribed offline).

Check: spoken question to spoken answer in the browser; SQL panel shows the query.

### Step 6: Cash flow (D-3)
- `GET /api/forecast` (R11 idempotent offer), `POST /api/offers/{id}/decide` (tap path), graph wired with `interrupt()` and `Command(resume=...)`, thread id = offer id.
- `BalanceChart` (Recharts, zero line, shaded gap), `ObligationList`, `OfferCard` with Approve / Not now, `SimulatedTag`.
- Approval flips status to `approved` and the chart recomputes with `+amount` on the approval date.

Check: gap on day +7, ₹30,000 offer, approve, line lifts above zero.

### Step 7: Growth (D-3)
- `GET /api/growth`, `draft_promo` (25 words, merchant language, no emojis), `PromoCard` (Approve / Edit / Reject), `VoiceApprove` (4 s listen, shows the heard word).
- Voice path per R7 and R8; unmatched transcript returns 422 `undecided` and the UI says "Didn't catch that, try again" in the merchant's language.
- Approving a promo sets `sent` via the executor stub; Reject sets `rejected`.

Check: "avunu" / "అవును" / "haan" marks the offer `sent`; "kaadu" / "కాదు" / "nahi" marks it `rejected`; "nahi" never counts as yes.

### Step 8: Home and Soundbox (D-2)
- `EarningsCard`, `MunimSaysCard` with play button, `AlertCard`s linking to the Cash and Grow tabs.
- `SoundboxDevice`: speaker grille, one blue button, LED, "Simulated Soundbox" tooltip; plays chime then briefing audio. The first click in the demo is this button, which unlocks autoplay.

Check: Soundbox plays within 1 s of the first click.

### Step 9: Resilience (D-2)
- Fallback chain: gpt-4o timeout or 5xx, then gpt-4o-mini; speech provider switch, then prerecorded.
- `POST /api/reset` guarded by `DEMO_MODE=true`: re-runs the seed, clears `conversations` and `offers`, regenerates briefing cache. Under 10 s.
- Error contract `{"error": {"code", "message", "message_local"}}` everywhere.
- Smoke script `scripts/smoke.py`: hits every endpoint, asserts the planted numbers, runs the grounding test. Wired into `make demo`.

Check: disable the network for 30 s mid-demo; the scripted path still completes.

### Step 10: Package (D-1)
- `make demo` / `scripts/demo.ps1`: `docker compose up -d db`, install deps, `migrate`, `seed_demo`, `generate_briefing`, `runserver --noreload` and `npm run dev`; smoke script at the end.
- README: pitch paragraph, architecture images from the Build Plan (stack diagram and approval-gate diagram), real-vs-simulated table, setup, team and track ("Team Versa, Nikhil, Track 1: Merchant Growth AI").
- `.env.example` committed; real `.env` ignored.
- Record the 2-minute backup demo video (screen and mic) and keep a copy on a phone; export deck PDF.
- Fresh-clone test on a second machine.

---

## 5. Cross-cutting rules (apply in every step)

- **No number without a tool result.** The LLM drafts in English, the render step translates, both are stored. Numbers in the rendered text are produced by a formatter from tool values, not by the model.
- **No write path from the LLM.** `run_sql` uses the read-only role; the only runtime writes are `Offer` and `Conversation`, from Python code.
- **Nothing acts without a yes.** Every proposal passes the `interrupt()` node; the executor only runs after `approved == True`. Executor results always carry `simulated: true` and the UI shows the tag.
- **One place for demo constants.** `DEMO_TODAY`, `MERCHANT_LANGUAGE`, `OPERATING_COST_RATIO` come from settings or env, never from views.
- **Timeouts everywhere.** LLM 10 s, SQL 3 s, voice listen 4 s, record 20 s, spinner cap 6 s.
- **Audit trail.** One `Conversation` row per `/api/ask`; one log line per tool call.
- **Language.** All merchant-facing labels come from one i18n dictionary keyed by `te-IN` / `hi-IN`; developer labels may stay English.

---

## 6. Verification plan

| Level | What | When |
| --- | --- | --- |
| Seed assertions | Five story lines print and pass | every `seed_demo` |
| Unit tests | Grounding test (3 scripted questions), voice-word matcher (Latin, Devanagari, Telugu, "nahi" case), `run_sql` guard (rejects DML, multi-statement, over-timeout), forecast shape (14 days, gap on day +7), credit rule (30,000) | every `make demo` |
| Smoke script | All 7 endpoints plus planted numbers | every `make demo`, after every freeze |
| Latency | Stopwatch 10 spoken questions on hotspot and on venue Wi-Fi; target p50 ≤ 5 s, p95 ≤ 8 s | D-2, event hour 0 |
| Offline drill | Cut network for 30 s mid-script | D-2 and D-1 |
| Fresh clone | `git clone`, copy `.env`, `make demo` on a second machine | D-1 |
| Rehearsal | Full 5-minute script three times, timed; one unscripted Hindi question from a "judge" | D-0 and event hour 6 |
| Reset loop | Run the whole demo twice in a row with `/api/reset` between | D-1 |

---

## 7. Resilience matrix (all fallbacks built before the event)

| Failure | Detection | Built-in fallback |
| --- | --- | --- |
| LLM slow or down | 10 s timeout, 5xx | retry on gpt-4o-mini; cached scripted answers (tools still run) |
| Sarvam down | non-2xx, timeout | `SPEECH_PROVIDER=openai`, then `prerecorded` with scripted-question chips |
| STT mishears | transcript shown before the answer | Repeat naturally; 3 phrasings per scripted question in the cache; text box visible |
| Bad generated SQL | execution error | One retry with the error; otherwise "I don't have that data"; `explain_settlement` and `kpi_summary` avoid SQL for the common questions |
| Autoplay blocked | audio promise rejects | First click is the Soundbox button |
| State corrupted by repeats | judge-round drift | `/api/reset` or `make reset` in under 10 s |
| Venue Wi-Fi blocks APIs | hour-0 test | Phone hotspot is primary |
| Laptop failure | n/a | Second laptop with a verified fresh clone; backup video on a phone |
| Question outside the data | certain | Agent says it does not have that data; show it as a feature |

If live voice fails twice, switch to the recorded run without apologising (rehearse the switch).

---

## 8. Event-day and demo

Follow the Build Plan's hour-by-hour table and 5-minute script unchanged, with two edits from this plan: the supplier payment is on **day +7** (say "a week early" instead of "nine days early"), and the briefing weekday is **Wednesday**. Freeze at hour 5, submit at hour 7.

**Definition of done (from the PRD):** on a fresh clone with `make demo`, a judge can press the Soundbox and hear the briefing, say "mera settlement kam kyun aaya" and hear ₹1,420 explained with the SQL on screen, approve a ₹30,000 credit offer against a visible day-7 gap, and send a Telugu promo to 40 lapsed regulars by saying "avunu", all in under 2½ minutes, twice in a row, with `/api/reset` between runs.

### Submission checklist
- [ ] Public GitHub repo, `main` tagged `finale`, fresh clone runs with `make demo`
- [ ] README: pitch paragraph, architecture diagram, real-vs-simulated table, setup, team and track
- [ ] Deck exported to PDF, contact placeholder on slide 8 filled in
- [ ] 2-minute demo video uploaded where the form asks, copy on a phone
- [ ] `.env.example` committed, real `.env` not committed
- [ ] Team Versa, Nikhil, Track 1: Merchant Growth AI on every document
- [ ] Second machine passes `make demo`
- [ ] Wired mic, charger, hotspot, HDMI/USB-C adapter in the bag

---

## 9. Open questions (need your answer, defaults noted)

1. **Finale date and team size?** Plan assumes 1 to 2 people and the D-6 to D-0 schedule; give me the date and I will turn D-n into calendar dates.
2. **Primary demo language: Telugu or Hindi?** Default `te-IN` for the briefing and promo, Hindi for the spoken question as in the script. Both must be recorded and tested either way.
3. **Accept R2 to R4?** They change the persona ticket (₹103), the supplier due date (day +7) and two script phrases. If you would rather keep day +9, the first negative day becomes +9 and the F4 acceptance text changes instead.
4. **API accounts:** are the OpenAI and Sarvam keys already funded?
5. **Repo location:** OK to move the project out of OneDrive before the venv and `node_modules` are created?

---

## 10. Login, several merchants and several languages (added after the first build)

**Login.** Mobile number + one-time code. `apps/api/auth.py` issues a code for a known merchant (hashed in `otp_challenges`, 5-minute expiry, 5 wrong tries lock it, 5 codes per 10 minutes per number); unknown numbers get the same reply, so accounts cannot be probed. The session is a signed, HttpOnly cookie (not a bearer token, because `<audio>` cannot send headers). State-changing requests are CSRF-checked. Audio lives under `media/m<merchant>/` and is served only to that merchant. SMS delivery is the stub `apps/api/sms.py`; in `DEMO_MODE` the code is `123456` and is shown on screen.

**Several merchants.** `MERCHANT_ID` is gone: the merchant comes from the session and is passed through every tool, agent, graph state and cache. Offers, conversations and audio are looked up only within the logged-in merchant (another merchant's id is a 404). The agent's SQL runs as `munim_ro` inside a transaction that sets `app.merchant_id`; Postgres row-level security then hides every other merchant's rows (no setting means no rows). `customers` has its own id because a customer hash is only unique per merchant. Pre-recorded clips are keyed `m<merchant>_<name>_<language>` so one shop's numbers never play for another.

**Languages.** `apps/i18n` is a registry: one JSON catalog per language (sentence templates, month and weekday names, scripted-question keywords, example questions, yes/no words, script ranges). `templates.py` only decides which numbers go into the sentences. The frontend has matching catalogs in `src/locales`. The merchant's saved language (header switcher, `PATCH /api/me`) drives the UI, answers, offers and briefing; a spoken question in another supported language is answered in that language.

**To add a language:** copy `backend/apps/i18n/locales/en-IN.json` and `frontend/src/locales/en-IN.json`, translate (native-speaker review), add Sarvam's language code to the speech test, run `make test` (it checks every catalog has every key and that each example question is recognised).

**Demo data.** `seed_demo` now creates two merchants (about 8 s): Lakshmi Kirana (9876500001, Telugu, the planted stories) and Sharma Provision Store (9876500002, Hindi, plain data, no cash gap).
