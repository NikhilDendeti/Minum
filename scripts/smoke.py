"""Smoke test: hits every API endpoint in-process (no server needed) and checks the planted numbers.

Run after `seed_demo` and `generate_briefing`:  python scripts/smoke.py
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "munim.settings")

import django  # noqa: E402

django.setup()

from rest_framework.test import APIClient  # noqa: E402

from apps.agents import grounding  # noqa: E402

failures = []


def check(name, condition, detail=""):
    print(("PASS " if condition else "FAIL ") + name + (f"  {detail}" if detail and not condition else ""))
    if not condition:
        failures.append(name)


def login(phone):
    client = APIClient(enforce_csrf_checks=False)
    code = client.post("/api/auth/request-otp", {"phone": phone}, format="json").json().get("dev_otp")
    r = client.post("/api/auth/verify", {"phone": phone, "otp": code}, format="json")
    return client, r


# --- auth -------------------------------------------------------------------------------------------------------
anon = APIClient()
r = anon.get("/api/briefing")
check("unauthenticated request -> 401", r.status_code == 401 and r.json()["error"]["code"] == "unauthenticated", r.content)
r = anon.post("/api/auth/verify", {"phone": "9876500001", "otp": "000000"}, format="json")
check("wrong OTP -> 400 invalid_otp", r.status_code == 400 and r.json()["error"]["code"] == "invalid_otp", r.content)

client, r = login("9876500001")
check("login as Lakshmi", r.status_code == 200 and r.json()["name"] == "Lakshmi Kirana", r.content)
other, r2 = login("9876500002")
check("login as the second merchant", r2.status_code == 200 and r2.json()["language"] == "hi-IN", r2.content)

# --- Lakshmi's planted numbers ------------------------------------------------------------------------------------
r = client.get("/api/briefing")
b = r.json()
check("GET /api/briefing", r.status_code == 200 and b["kpis"]["yesterday"] == 8200 and b["kpis"]["delta_pct"] == -12.0, b.get("kpis"))
check("briefing has alerts", {a["type"] for a in b["alerts"]} >= {"settlement_short", "cash_gap"}, b["alerts"])

for question in ("Mera settlement kam kyun aaya?", "Why is my settlement short?"):
    r = client.post("/api/ask", {"text": question}, format="multipart")
    a = r.json()
    check(f"POST /api/ask '{question}'", r.status_code == 200 and "1,420" in a["answer_en"] and "FROM settlements" in a["evidence"]["sql"],
          a if r.status_code != 200 else a.get("answer_en"))
settle_id = a["conversation_id"]
r = client.get(f"/api/conversations/{settle_id}")
check("GET /api/conversations/{id}", r.status_code == 200 and r.json()["sql"] == a["evidence"]["sql"])

r = client.post("/api/ask", {"text": "Kal kitna hua?"}, format="multipart")
check("ask: yesterday", "8,200" in r.json()["answer_en"], r.json())

r = client.get("/api/forecast")
f = r.json()
check("GET /api/forecast", r.status_code == 200 and len(f["days"]) == 14 and f["gap"]["min_balance"] == -12800
      and f["offer"]["payload"]["amount"] == 30000, f.get("gap"))
credit_id = f["offer"]["id"]

r = client.get("/api/growth")
g = r.json()
check("GET /api/growth", r.status_code == 200 and g["segment"]["count"] == 40 and g["offer"]["status"] == "proposed", g.get("segment"))
promo_id = g["offer"]["id"]

# --- tenant isolation ---------------------------------------------------------------------------------------------
r = other.post(f"/api/offers/{promo_id}/decide", {"decision": "approve", "via": "tap"}, format="json")
check("other merchant cannot decide Lakshmi's offer (404)", r.status_code == 404, r.content)
r = other.get(f"/api/conversations/{settle_id}")
check("other merchant cannot read Lakshmi's conversation (404)", r.status_code == 404, r.content)
r = other.get("/api/forecast")
check("other merchant has its own data (no cash gap)", r.status_code == 200 and r.json()["gap"] is None, r.content)
r = other.post("/api/ask", {"text": "Kal kitna hua?"}, format="multipart")
check("other merchant's numbers differ from Lakshmi's", r.status_code == 200 and "8,200" not in r.json()["answer_en"], r.content)

# --- decisions ----------------------------------------------------------------------------------------------------
r = client.post(f"/api/offers/{promo_id}/decide", {"via": "voice", "transcript": "blah blah"}, format="json")
check("decide: unmatched voice -> 422 undecided", r.status_code == 422 and r.json()["error"]["code"] == "undecided")
r = client.post(f"/api/offers/{promo_id}/decide", {"via": "voice", "transcript": "avunu"}, format="json")
check("decide: 'avunu' sends the promo", r.status_code == 200 and r.json()["status"] == "sent" and r.json()["simulated"], r.json())

r = client.post(f"/api/offers/{credit_id}/decide", {"decision": "approve", "via": "tap"}, format="json")
check("decide: tap approves credit", r.status_code == 200 and r.json()["status"] == "approved", r.json())
f2 = client.get("/api/forecast").json()
check("forecast updates after approval", f2["offer"]["status"] == "approved" and f2["gap"] is None and f2["credit_applied"] == 30000)

r = client.post("/api/ask", {"text": "Paise kab tak chalenge?"}, format="multipart")
check("ask: cash question after approval has no open proposal", r.status_code == 200 and r.json()["proposal"] is None, r.json())

# --- language ---------------------------------------------------------------------------------------------------
r = client.patch("/api/me", {"language": "hi-IN"}, format="json")
check("PATCH /api/me switches language", r.status_code == 200 and r.json()["language"] == "hi-IN", r.content)
r = client.get("/api/briefing")
check("briefing follows the language", "कल" in r.json()["text_local"] or "रुपये" in r.json()["text_local"], r.json().get("text_local"))
r = client.patch("/api/me", {"language": "en-IN"}, format="json")
b = client.get("/api/briefing").json()
check("English briefing", b["language"] == "en-IN" and b["text_local"].startswith("Yesterday you earned Rs 8,200"), b.get("text_local"))
check("rejects unknown language", client.patch("/api/me", {"language": "xx-XX"}, format="json").status_code == 400)
client.patch("/api/me", {"language": "te-IN"}, format="json")

r = client.post("/api/auth/logout")
check("logout", r.status_code == 200 and client.get("/api/me").status_code == 401)

# --- reset ----------------------------------------------------------------------------------------------------------
client, _ = login("9876500001")
r = client.post("/api/reset")
check("POST /api/reset", r.status_code == 200 and r.json()["seeded"] and len(r.json()["stories"]) >= 5, r.json())
check("reset restores proposed offers", client.get("/api/growth").json()["offer"]["status"] == "proposed")

# the approval gate on the spoken path: ask -> graph pauses at interrupt() -> a bare "haan" resumes it
r = client.post("/api/ask", {"text": "Purane customer wapas kaise aayenge?"}, format="multipart")
check("ask: growth question returns a proposal", r.status_code == 200 and r.json()["proposal"]["status"] == "proposed", r.json())
r = client.post("/api/ask", {"text": "haan"}, format="multipart")
check("ask: 'haan' approves the waiting promo", r.status_code == 200 and r.json()["intent"] == "approval"
      and r.json()["proposal"]["status"] == "sent", r.json())
check("promo stays sent on reload", client.get("/api/growth").json()["offer"]["status"] == "sent")
client.post("/api/reset")

print("\nAll smoke checks passed." if not failures else f"\n{len(failures)} smoke check(s) failed: {failures}")
sys.exit(1 if failures else 0)
