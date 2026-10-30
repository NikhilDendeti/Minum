# Munim: Pitch and 5-Minute Presentation Guide

**Live demo:** https://minum.up.railway.app  ·  **Team Versa** · Nikhil · **Track 1: Merchant Growth AI**

Everything here is checked against the running build. If a line in this file and the app disagree, trust the app and fix the line.

---

## 1. The idea in one breath

> Every Paytm merchant used to have a *munim*, an accountant who knew the shop. Lakshmi in Kukatpally doesn't. **Munim is that accountant, on the Soundbox and in the app: it speaks to her in Telugu, answers from her own sales data, warns her before cash runs out, and acts only when she says yes.**

**Three-line version (for the first 20 seconds):**

1. She gets a **spoken briefing** every morning, in her language.
2. She can **ask anything** and every number traces to a query she can open.
3. It **looks ahead**: it predicts a cash gap a week early, and offers a pre-approved credit exactly when she needs it. Nothing runs without her approval.

**Why Paytm wins from it:** credit is offered at the moment of need, so conversion goes up and defaults go down. The merchant gets an accountant she could never afford. Paytm stops being "a QR on the counter" and becomes the business partner.

---

## 2. What makes it different (say this, don't read it)

| Most Track 1 entries | Munim |
| --- | --- |
| A dashboard plus a chatbot | A voice-first partner that **talks first**, in the merchant's language |
| LLM writes the numbers | **The LLM never writes a number.** Tools return them, a check rejects any figure no tool returned, and the SQL is one click away |
| "AI recommends" | **Forecast, then credit.** A cash gap is predicted a week early and a pre-approved offer appears before it |
| Approve by button | Approve **by voice** (haan, avunu) or tap. Matching is deterministic, so it is fast and demo-safe |
| English UI | **Hindi, Telugu and English** across UI, speech and offers |
| One demo account | **Six merchants** with different shapes, each fenced from the others |

Of the nine public Track 1 repositories reviewed, none combines a cash-flow forecast, a credit offer, voice approval and SQL-visible grounding. Use that as a private confidence point. Do not say it on stage unless asked.

---

## 3. Mapping to the judging criteria

The published criteria are innovation, technical implementation, originality, problem solving and presentation.

| Criterion | The proof to show | Where in the 5 minutes |
| --- | --- | --- |
| **Innovation / originality** | Soundbox as the channel. Forecast then credit. Voice approval. | Briefing, Cash |
| **Technical implementation** | Live Telugu or Hindi voice round trip. SQL panel. LangGraph approval gate. Read-only Postgres with row-level security. | Ask, close |
| **Problem solving** | One merchant story told end to end, with the exact numbers the agent found | The whole demo |
| **Presentation** | Live demo on the real URL, honest real-vs-simulated slide, a calm recovery plan | Open, close |

---

## 4. The 5-minute run sheet

Two slides at most. The product is the pitch. Start the clock when you speak.

| Time | You do | You say |
| --- | --- | --- |
| **0:00 to 0:25** | Slide: cover, then straight to the app | "Every Paytm merchant used to have a munim, an accountant who knew the business. Lakshmi in Kukatpally doesn't. We built her one." |
| **0:25 to 0:50** | Slide: problem (or skip the slide and say it over the landing page) | "She has the data of a business and none of the advice. She does not know why a settlement is short, she finds out about a cash crunch when it hits, and every dashboard is in English. Paytm stays a QR on the counter." |
| **0:50 to 1:20** | **Home.** Press the **Soundbox** or **Hear today's briefing** | "It's morning. She presses the Soundbox." Let the chime and the Telugu briefing play. "Yesterday: ₹8,200, twelve percent below a usual Wednesday. Evenings are slow. A settlement came in short." |
| **1:20 to 2:05** | **Ask Munim.** Hold the mic and ask, in Hindi: *"Mera settlement kam kyun aaya?"* | "She heard the settlement was short. She just asks." Wait for the spoken answer: **₹1,420 short, ₹890 in two refunds, ₹530 in fees.** Open **View data and SQL** for two seconds. "Every number comes from a query, not from the model's imagination. The AI is not allowed to write a figure." |
| **2:05 to 2:55** | **Cash & Credit** | "Munim also looks ahead." Point at the line dipping below zero. "On 19 November a ₹45,000 supplier payment pushes her **₹12,800 below zero**. Munim saw it a week early, and a **pre-approved ₹30,000 credit** is waiting. With it her lowest balance is **₹17,200**. This is where Paytm's lending meets what the merchant actually needs, at the moment she needs it." Tap **Review and accept**, then confirm in the dialog (by tap, or hold the mic and say yes). |
| **2:55 to 3:35** | **Customer Growth** | "And it finds growth. **Forty regular customers** haven't been back in two weeks." Show the drafted offer. "Nothing happens without her yes." Tap **Approve and send**. In the confirmation dialog, **hold the mic and say "avunu"** (Telugu) or **"haan"** (Hindi), or tap confirm. Status flips to sent. Rehearse this dialog once: it is the only step that needs a second action. |
| **3:35 to 4:15** | Slide: how it works, or just talk over the app | "Under the hood: Sarvam for Telugu and Hindi speech in and out, LangGraph agents with an approval gate, GPT-4o, Django, Postgres. Questions run on a read-only database role fenced by row-level security. **The data is synthetic, the pipeline is real, and the send is simulated.** Six different merchants run on the same code." |
| **4:15 to 4:45** | Slide: business case | "Credit offered when the forecast shows a gap: better conversion, fewer defaults. The core copilot is free. Paytm earns on the lending, the campaigns and the loyalty it unlocks. A full session costs about a rupee to run." |
| **4:45 to 5:00** | Close, eye contact, no slide | "From payments to a partner for every merchant. Thank you." |

**If you are running long**, cut in this order: the SQL panel dwell time, the slide on business case, the second language. **Never cut** the cash gap and the credit offer. That is the story only Paytm can tell.

---

## 5. The demo, exactly

### Setup (do this 20 minutes before)

1. Open https://minum.up.railway.app on the laptop. Sign in as **Lakshmi Kirana** (phone `9876500001`, code `123456` shown on screen).
2. Set the header language to **తెలుగు** (the app remembers it per merchant). For a Hindi-speaking judge use **Sharma Provision Store** (`9876500002`) instead.
3. Open `https://minum.up.railway.app/?demo=1` once so the small **reset** button is available between rounds.
4. Reset once so the credit offer and the promo are both back to **proposed**.
5. Press the **Soundbox** once. This unlocks browser audio and warms the speech cache.
6. Run the whole script once. The first run speaks each reply live (about 4 to 5 seconds each). Every repeat afterwards is cached and instant.
7. Laptop on power, sleep disabled, volume checked on the room speaker, phone hotspot on as a second network.

### Questions that always work (scripted, instant, same SQL every time)

| Language | Say |
| --- | --- |
| Hindi | "Mera settlement kam kyun aaya?" · "Kal kitna hua?" · "Paise kab tak chalenge?" · "Purane customer wapas kaise aayenge?" |
| Telugu | "నా సెటిల్మెంట్ ఎందుకు తక్కువ వచ్చింది?" · "నిన్న ఎంత వచ్చింది?" |
| English | "Why is my settlement short?" · "How much did I earn yesterday?" · "How long will my cash last?" |

### If a judge asks something unscripted

It works, and it is a feature. Free-form questions go through the SQL agent and take 4 to 6 seconds to start speaking. While it thinks, say: "This one is not scripted. It is writing a query against her data right now." Good ones to invite:

- "Why are my evenings slow?" → evenings sell about **37% less** than the 11 am to 1 pm lunch peak.
- "What is my average ticket?" → about ₹103.
- "Who are my top 3 customers?" → three customers with their spend (names are hashed on purpose).
- Anything outside the data (GST, loans in general) → **"I don't have that data, so I won't guess."** Present that as the feature it is.

### Reset between judge rounds

Press the **reset** button (needs `?demo=1`). Both offers return to *proposed* and the briefing is regenerated from cache.

---

## 6. Numbers cheat sheet (all verified in the build)

| Fact | Value |
| --- | --- |
| Persona | Lakshmi Kirana, grocery, Kukatpally, Hyderabad. Telugu first, Hindi second. |
| Yesterday (Wed 11 Nov) | **₹8,200**, **12% below** the 4-week Wednesday average of ₹9,320 |
| Slow window | Evenings 6 to 9 pm. About **37%** below the lunch peak over the last 90 weekdays |
| Short settlement | 9 Nov: **₹1,420** below gross. ₹890 in two refunds, ₹530 in fees |
| Cash gap | **19 Nov**, lowest balance **−₹12,800**, caused by a ₹45,000 supplier payment |
| Credit offer | **₹30,000** for 30 days. Basis: 15 × average daily net inflow (₹2,010). With it the lowest balance is **₹17,200** |
| Lapsed regulars | **40** customers with 5 or more visits, none in 14 or more days |
| Promo | 10% off for 7 days, to those 40, sent only after approval |
| Merchants | 6: Lakshmi (te), Sharma (hi), Sai Ram Medicals (hi), Venkat Tiffins (te), Glow Salon (en), Raju Vegetables (te) |
| Quality | 39 automated tests, plus a smoke script that checks every endpoint and the planted numbers |

---

## 7. Real versus simulated (say it before they ask)

| Real and running | Simulated, and labelled in the UI |
| --- | --- |
| Synthetic data pipeline with five planted stories, six merchants | Paytm production data and APIs |
| SQL-grounded answers on a read-only Postgres role with row-level security | The promo send and the credit disbursal |
| LangGraph router, three agents, approval gate | The Soundbox hardware (an on-screen device plays the audio) |
| Cash-flow forecast and the credit rule | Credit interest, fees and repayment schedule (shown as "not provided in this demo") |
| Speech in and out with Sarvam, automatic fallback to OpenAI | |
| Voice approval (yes and no in Hindi, Telugu and English) | |
| Login, per-merchant isolation, three languages | |

**The line:** "The data is synthetic, the pipeline is real, the send is simulated."

---

## 8. Likely questions, one-breath answers

**What if the AI hallucinates a number?**
It cannot write one. The model calls tools, a check rejects any number in the draft that no tool returned, and we store the English draft and the SQL for every turn. Open the SQL panel and see it.

**How does the credit decision work?**
A transparent rule for the prototype: fifteen days of average net inflow, capped at ₹50,000. In production this is Paytm's own underwriting. We only change *when* the offer is made, a week before the gap instead of after it.

**Why voice approval by word matching?**
It is fast, deterministic and safe. The words are matched before any model is called, so a mishear cannot approve a loan. If it is unsure, nothing happens.

**Is the merchant's data safe?**
Every query is scoped to the signed-in merchant and the database blocks cross-merchant reads with row-level security. The model can only run `SELECT` on a read-only role. Customers appear only as counts or hashes, and the promo goes through Paytm, not a phone list.

**What does it cost to run?**
A full session, a briefing plus a few questions, is about a rupee of speech and model cost at today's prices. The morning briefing is generated once and cached.

**How does it scale to millions of merchants?**
The briefing is a nightly batch job per merchant and spoken audio is cached. Only follow-up questions are real time. The agents are stateless and the data is already in Paytm's warehouse.

**Which languages?**
Hindi, Telugu and English today. Adding one is one catalog file on each side plus a speech test.

**What would you build next with Paytm's data?**
Settlement anomaly alerts, GST-ready summaries, stock hints from item-level POS data, and real Soundbox delivery. On real hardware this is a firmware update, not a new device.

**How is this different from the other merchant copilots?**
Three things: it speaks through the Soundbox the merchant already owns, it ties the forecast to a Paytm credit offer, and it approves by voice. Most entries stop at a dashboard plus chat.

**Is it using real Paytm data or the real Soundbox?**
No, and the UI says so. The data is synthetic and the Soundbox is simulated on screen. We say that up front.

---

## 9. What can go wrong, and the answer already prepared

| Problem | What you do |
| --- | --- |
| Venue Wi-Fi is slow or blocks the app | Switch to the phone hotspot. Test both at arrival. |
| The mic mishears the judge | The transcript shows before the answer. Say "let me repeat that" and ask again, or tap one of the suggested questions. |
| Sarvam is down or out of credit | The app falls back to OpenAI speech on its own. Telugu sounds less natural but everything works. Keep going. |
| The voice fails twice | Say "Let me show you the recorded run" and play the 2-minute video. Do not apologise further. |
| The answer is slow | Fill the gap: "this one is writing a query against her data right now." |
| Browser blocks audio | The first click of the demo is the Soundbox button, which unlocks audio. |
| State gets messy after approvals | Press **reset** (`?demo=1`). |
| The laptop dies | Second device with the live URL open, and the video on your phone. |

---

## 10. Do and don't

**Do**
- Open with the story, not the architecture.
- Let the audio play. Silence while she "speaks" is the most persuasive moment of the demo.
- Show the SQL once, briefly, and move on.
- Say "simulated" and "synthetic" yourself, early, with confidence.
- End on the credit offer and the approval. That is the sentence Paytm remembers.

**Don't**
- Don't read slides.
- Don't claim you built on the real Soundbox or used real Paytm data or APIs.
- Don't quote the evening gap as 35%. The live app says **37%**, and a judge may check.
- Don't promise accuracy or uplift figures you have not measured.
- Don't open a second tab of the app while talking.

---

## 11. Pre-flight checklist (the night before and the morning of)

**Tonight**
- [ ] Record the **2-minute backup video** on the live link and copy it to your phone.
- [ ] Run the whole script **three times**, one on the phone hotspot, with one unscripted Hindi and one Telugu question. This also fills the audio cache.
- [ ] Delete the old Sarvam API keys. Delete the working one after the finale.
- [ ] Charge laptop and phone. Disable laptop sleep. Pack the wired mic, charger, adapter.

**Morning**
- [ ] Hotspot on. Open the live URL, sign in as Lakshmi, language Telugu, reset once.
- [ ] Press the Soundbox once to unlock audio and run the script once on the venue network.
- [ ] Browser already on **Home** before you start talking. Volume tested.
- [ ] Freeze. No code changes unless a bug blocks the demo.

---

## 12. The closing line

> "Paytm already sits at the counter of millions of merchants. Munim turns that counter into a partnership: a voice that knows the business, warns before the crunch, and acts only with the merchant's yes."
