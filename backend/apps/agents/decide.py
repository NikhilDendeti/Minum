import uuid

from langgraph.types import Command

from apps.tools.offers import set_thread

from .graph import config, get_graph


def decide_offer(offer, approved, via="tap", transcript="", language="en-IN"):
    """Resolve an offer through the graph's approval gate and return the final graph state values.

    If the offer is already waiting at the gate (it came from /api/ask) that paused thread is resumed.
    Offers made directly by /api/forecast or /api/growth have no thread yet: a fresh run goes straight to
    the gate and is resumed immediately, so every action passes through the same interrupt().
    """
    graph = get_graph()
    thread = offer.payload.get("thread_id")
    pending = False
    if thread:
        pending = "approval" in (graph.get_state(config(thread)).next or ())
    if not pending:
        thread = f"offer-{offer.id}-{uuid.uuid4().hex[:8]}"
        set_thread(offer, thread)
        graph.invoke({"thread_id": thread, "merchant_id": offer.merchant_id, "proposal_id": offer.id,
                      "language": language, "tool_calls": []}, config(thread))
    graph.invoke(Command(resume={"approved": approved, "via": via, "transcript": transcript}), config(thread))
    return graph.get_state(config(thread)).values
