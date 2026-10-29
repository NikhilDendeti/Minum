"""One /api/ask turn: run the graph, assemble the evidence (SQL + rows) shown in the SQL panel."""
import uuid
from datetime import timedelta

from django.conf import settings

from apps.tools.sql import run_sql

from .graph import config, get_graph

# SQL equivalents shown for answers that are computed in Python (forecast, segment).
_CASH_SQL = "SELECT label, amount, due_on FROM obligations WHERE paid = false ORDER BY due_on"


def run_turn(merchant_id, transcript, language):
    graph = get_graph()
    thread = f"ask-{uuid.uuid4().hex[:10]}"
    graph.invoke({"thread_id": thread, "merchant_id": merchant_id, "transcript": transcript,
                  "language": language, "tool_calls": []}, config(thread))
    return graph.get_state(config(thread)).values


def _sql_evidence(merchant_id, sql, tool):
    return {"sql": sql, "rows": run_sql(merchant_id, sql)["rows"], "tool": tool}


def build_evidence(merchant_id, values):
    calls = values.get("tool_calls") or []
    for call in reversed(calls):
        result = call.get("result")
        if call["name"] == "run_sql" and isinstance(result, dict) and "rows" in result:
            return {"sql": call["args"].get("query", ""), "rows": result["rows"], "tool": "run_sql"}
        if isinstance(result, dict) and result.get("evidence"):
            return {**result["evidence"], "tool": call["name"]}
    agent = values.get("agent")
    if agent == "cashflow":
        return _sql_evidence(merchant_id, _CASH_SQL, "forecast")
    if agent == "growth":
        cutoff = settings.DEMO_TODAY - timedelta(days=14)
        return _sql_evidence(
            merchant_id,
            "SELECT customer_hash, visit_count, last_seen, total_spend FROM customers "
            f"WHERE visit_count >= 5 AND last_seen < '{cutoff.isoformat()}' ORDER BY total_spend DESC LIMIT 10",
            "segment_customers")
    return {"sql": "", "rows": [], "tool": calls[-1]["name"] if calls else None}
