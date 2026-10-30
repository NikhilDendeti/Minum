"""One /api/ask turn: run the graph, assemble the evidence (SQL + rows) shown in the SQL panel."""
import uuid
from datetime import timedelta

from django.conf import settings

from apps.tools.sql import run_sql

from . import grounding
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


def _evidence_of(call):
    result = call.get("result")
    if call["name"] == "run_sql":
        if isinstance(result, dict) and "rows" in result:
            return {"sql": call["args"].get("query", ""), "rows": result["rows"], "tool": "run_sql"}
        # a query that failed or was rejected still ran (or was tried): show it, with why it gave nothing
        if isinstance(result, dict) and result.get("error"):
            return {"sql": call["args"].get("query", ""), "rows": [], "tool": "run_sql", "error": str(result["error"])}
    if isinstance(result, dict) and result.get("evidence"):
        return {**result["evidence"], "tool": call["name"]}
    return None


def _covered(evidence, answer_numbers):
    """How many numbers of the answer appear in the evidence rows."""
    shown = grounding.result_numbers(evidence["rows"])
    return sum(1 for n in answer_numbers if any(abs(n - a) < 1e-6 or round(a) == n for a in shown))


def _with_queries(best, queries):
    """`sql` / `rows` stay the single best-matching query (older clients); `queries` is every query run in the turn."""
    return {**best, "queries": queries, "query_count": len(queries), "row_count": sum(len(q["rows"]) for q in queries)}


def build_evidence(merchant_id, values):
    calls = values.get("tool_calls") or []
    answer_numbers = set(grounding.numbers_in(values.get("answer_en") or ""))
    queries = [e for e in map(_evidence_of, calls) if e is not None]  # every tool call that ran a query, in order
    best, best_score = None, -1
    for evidence in reversed(queries):  # latest first, so a tie goes to the latest call
        score = _covered(evidence, answer_numbers)
        if score > best_score:
            best, best_score = evidence, score
    if best:
        return _with_queries(best, queries)
    agent = values.get("agent")
    if agent == "cashflow":
        fallback = _sql_evidence(merchant_id, _CASH_SQL, "forecast")
    elif agent == "growth":
        cutoff = settings.DEMO_TODAY - timedelta(days=14)
        fallback = _sql_evidence(
            merchant_id,
            "SELECT customer_hash, visit_count, last_seen, total_spend FROM customers "
            f"WHERE visit_count >= 5 AND last_seen < '{cutoff.isoformat()}' ORDER BY total_spend DESC LIMIT 10",
            "segment_customers")
    else:
        return {"sql": "", "rows": [], "tool": calls[-1]["name"] if calls else None, "queries": [], "query_count": 0, "row_count": 0}
    return _with_queries(fallback, [fallback])
