"""LangGraph StateGraph: router -> insights | cashflow | growth -> render -> [approval -> execute -> confirm] -> END.

`approval` calls interrupt(); nothing reaches `execute` (the only node that acts) without an explicit yes.
The checkpoint lives in a SQLite file so a paused approval survives between HTTP requests.
"""
import sqlite3
import threading
from typing import Any, TypedDict

from django.conf import settings
from django.utils import timezone
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from apps.core.models import Offer
from apps.tools import executor

from . import router as router_mod
from . import templates
from .cashflow import run_cashflow
from .growth import run_growth
from .insights import run_insights
from .render import render_answer


class MunimState(TypedDict, total=False):
    thread_id: str
    merchant_id: int
    transcript: str
    language: str
    intent: str
    agent: str
    scripted_id: Any
    tool_calls: list
    answer_en: str
    answer_local: str
    proposal_id: Any
    decision: dict
    approved: bool
    confirmation_en: str
    confirmation_local: str


def router_node(state):
    return router_mod.route(state["transcript"])


def render_node(state):
    if state.get("answer_local"):  # templates already produced the local text
        return {}
    return {"answer_local": render_answer(state["answer_en"], state["language"])}


def approval_node(state):
    decision = interrupt({"offer_id": state["proposal_id"]})
    return {"decision": decision, "approved": bool(decision.get("approved"))}


def execute_node(state):
    """The only node with side effects (simulated): record the decision and run the executor stub."""
    offer = Offer.objects.get(pk=state["proposal_id"], merchant_id=state["merchant_id"])  # never another merchant's
    offer.decided_at = timezone.now()
    offer.decided_via = state["decision"].get("via") or "tap"
    if state["approved"]:
        offer.save(update_fields=["decided_at", "decided_via"])
        {"credit": executor.disburse_credit, "promo": executor.send_promo, "stock": executor.set_reminder}[offer.type](offer.id)
    else:
        offer.status = "rejected"
        offer.save(update_fields=["status", "decided_at", "decided_via"])
    return {}


def confirm_node(state):
    offer = Offer.objects.get(pk=state["proposal_id"], merchant_id=state["merchant_id"])
    words = templates.confirmation(offer.type, state["approved"], offer.payload)
    return {"confirmation_en": words["en"], "confirmation_local": words[state["language"]]}


def _start(state):
    return "approval" if state.get("proposal_id") and not state.get("transcript") else "router"


def _after_render(state):
    return "approval" if state.get("proposal_id") else "done"


def build(checkpointer):
    g = StateGraph(MunimState)
    g.add_node("router", router_node)
    g.add_node("insights", run_insights)
    g.add_node("cashflow", run_cashflow)
    g.add_node("growth", run_growth)
    g.add_node("render", render_node)
    g.add_node("approval", approval_node)
    g.add_node("execute", execute_node)
    g.add_node("confirm", confirm_node)
    g.add_conditional_edges(START, _start, {"approval": "approval", "router": "router"})
    g.add_conditional_edges("router", lambda s: s["agent"], {"insights": "insights", "cashflow": "cashflow", "growth": "growth"})
    for agent in ("insights", "cashflow", "growth"):
        g.add_edge(agent, "render")
    g.add_conditional_edges("render", _after_render, {"approval": "approval", "done": END})
    g.add_edge("approval", "execute")
    g.add_edge("execute", "confirm")
    g.add_edge("confirm", END)
    return g.compile(checkpointer=checkpointer)


_graph = None
_lock = threading.Lock()


def get_graph():
    global _graph
    with _lock:
        if _graph is None:
            settings.LANGGRAPH_DB.parent.mkdir(parents=True, exist_ok=True)  # e.g. a fresh volume
            conn = sqlite3.connect(str(settings.LANGGRAPH_DB), check_same_thread=False)
            _graph = build(SqliteSaver(conn))
        return _graph


def config(thread_id):
    return {"configurable": {"thread_id": thread_id}}
