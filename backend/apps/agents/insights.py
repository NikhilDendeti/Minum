import json
import logging
from datetime import timedelta

from django.conf import settings
from django.db import DatabaseError

from apps.tools.kpi import kpi_summary
from apps.tools.settlement import explain_settlement
from apps.tools.sql import SqlRejected, run_sql

from . import grounding, llm, templates
from .polish import polish

log = logging.getLogger("munim.insights")
MAX_ROUNDS = 5

TOOLS = [
    {"type": "function", "function": {
        "name": "explain_settlement",
        "description": "Explain why a settlement was below gross sales (refunds, fees). Omit date for the most recent short one.",
        "parameters": {"type": "object", "properties": {"date": {"type": "string", "description": "YYYY-MM-DD"}}}}},
    {"type": "function", "function": {
        "name": "kpi_summary",
        "description": "Earnings for a day vs the 4-week same-weekday average, peak and slow hours, repeat-customer share, lapsed regulars.",
        "parameters": {"type": "object", "properties": {"day": {"type": "string", "description": "YYYY-MM-DD"}}, "required": ["day"]}}},
    {"type": "function", "function": {
        "name": "run_sql",
        "description": "Run one read-only SELECT against the shop database (max 50 rows).",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
]


def scripted_insight(merchant_id, qid):
    """Answer q_settlement / q_yesterday from fixed templates, running the real tools."""
    if qid == "q_settlement":
        result = explain_settlement(merchant_id)
        if "error" in result:  # this merchant has no settlement worth explaining
            return [{"name": "explain_settlement", "args": {}, "result": result}], templates.answer_other()
        return [{"name": "explain_settlement", "args": {}, "result": result}], templates.answer_settlement(result)
    day = settings.DEMO_TODAY - timedelta(days=1)
    result = kpi_summary(merchant_id, day)
    return [{"name": "kpi_summary", "args": {"day": day.isoformat()}, "result": result}], templates.answer_yesterday(result)


def _call(merchant_id, name, args):
    try:
        if name == "run_sql":
            return run_sql(merchant_id, args.get("query", ""))
        if name == "kpi_summary":
            return kpi_summary(merchant_id, args["day"])
        if name == "explain_settlement":
            return explain_settlement(merchant_id, args.get("date"))
        return {"error": f"unknown tool {name}"}
    except (SqlRejected, DatabaseError, KeyError, ValueError) as exc:
        return {"error": str(exc)}


def _system():
    today = settings.DEMO_TODAY
    return (llm.load_prompt("insights") + "\n\n" + (settings.BASE_DIR / "apps/tools/schema.md").read_text(encoding="utf-8")
            + f"\n\nToday is {today.isoformat()}. Yesterday was {(today - timedelta(days=1)).isoformat()}. Data ends yesterday.")


def run_insights(state):
    """LLM function-calling loop over run_sql / kpi_summary / explain_settlement."""
    merchant_id = state["merchant_id"]
    if state.get("scripted_id") in ("q_settlement", "q_yesterday"):
        calls, answers = scripted_insight(merchant_id, state["scripted_id"])
        return {"tool_calls": calls, "answer_en": answers["en"], "answer_local": answers[state["language"]]}

    messages = [{"role": "system", "content": _system()}, {"role": "user", "content": state["transcript"]}]
    calls, answer, corrected = [], "", False
    for _ in range(MAX_ROUNDS):
        msg = llm.complete(messages, tools=TOOLS)
        if msg.tool_calls:
            messages.append(msg.model_dump(exclude_none=True))
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except ValueError:
                    args = {}
                result = _call(merchant_id, tc.function.name, args)
                calls.append({"name": tc.function.name, "args": args, "result": result})
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result, default=str)})
            continue
        answer = (msg.content or "").strip()
        bad = grounding.ungrounded(answer, calls)
        if bad and not corrected:  # F6: never speak a number that no tool returned
            corrected = True
            messages += [{"role": "assistant", "content": answer},
                         {"role": "user", "content": f"These numbers are not in any tool result: {bad}. Rewrite using only tool results."}]
            continue
        if bad:
            log.warning("ungrounded numbers %s; falling back to 'no data' answer", bad)
            answer = templates.answer_other()["en"]
        break
    else:
        answer = templates.answer_other()["en"]
    return {"tool_calls": calls, "answer_en": polish(answer)}
