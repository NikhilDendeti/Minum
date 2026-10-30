"""One wrapper for every LLM call (OpenAI): 10 s timeout, then one retry on LLM_FALLBACK_MODEL (a faster, cheaper model)."""
import logging
import time
from pathlib import Path

from django.conf import settings
from openai import APITimeoutError, OpenAI

log = logging.getLogger("munim.llm")
PROMPTS = Path(__file__).parent / "prompts"
BREAKER_S = 30  # after both models fail, further calls fail instantly for this long (no stacked 10 s timeouts)
_down_until = 0.0
_down_timeout = False


class LLMUnavailable(Exception):
    def __init__(self, message="", timeout=False):
        super().__init__(message)
        self.timeout = timeout  # True when the last attempt timed out (the API answers 504 llm_timeout)


def load_prompt(name):
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


def complete(messages, tools=None, json_mode=False):
    """Return the assistant message (with .content and .tool_calls). Raises LLMUnavailable."""
    return complete_ex(messages, tools, json_mode)[0]


def complete_ex(messages, tools=None, json_mode=False):
    """Like complete(), but returns (message, truncated): truncated is True when the reply hit the token cap even after
    one retry with double the room, so the caller must not treat it as a whole answer."""
    global _down_until, _down_timeout
    if not settings.OPENAI_API_KEY:
        raise LLMUnavailable("OPENAI_API_KEY not set")
    if time.time() < _down_until:
        raise LLMUnavailable("LLM recently failed; not retrying yet", timeout=_down_timeout)
    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.LLM_TIMEOUT_S, max_retries=0)
    last = None
    for model in dict.fromkeys([settings.LLM_MODEL, settings.LLM_FALLBACK_MODEL]):  # primary, then fallback
        kwargs = {"model": model, "messages": messages, "temperature": 0, "max_tokens": settings.LLM_MAX_TOKENS}
        if tools:
            kwargs["tools"] = tools
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        t0 = time.time()
        try:
            choice = client.chat.completions.create(**kwargs).choices[0]
            if choice.finish_reason == "length":  # cut off by the token cap: ask once more with room to finish
                log.warning("llm model=%s hit max_tokens=%d; retrying with double", model, kwargs["max_tokens"])
                kwargs["max_tokens"] *= 2
                choice = client.chat.completions.create(**kwargs).choices[0]
            truncated = choice.finish_reason == "length"
            if truncated:
                log.warning("llm model=%s still truncated at max_tokens=%d", model, kwargs["max_tokens"])
            log.info("llm model=%s ms=%d", model, (time.time() - t0) * 1000)
            return choice.message, truncated
        except Exception as exc:  # timeout, 5xx, rate limit: try the fallback model
            log.warning("llm model=%s failed after %dms: %s", model, (time.time() - t0) * 1000, exc)
            last = exc
    _down_until, _down_timeout = time.time() + BREAKER_S, isinstance(last, APITimeoutError)
    raise LLMUnavailable(str(last), timeout=_down_timeout)


def chat(messages, json_mode=False):
    return (complete(messages, json_mode=json_mode).content or "").strip()
