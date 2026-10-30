import logging

from apps import i18n

from . import grounding, llm

log = logging.getLogger("munim.render")


def render_answer(answer_en, lang):
    """Translate the English draft into the merchant's language, keeping every number.

    If the model changes, adds or drops a number, or is unreachable, the English draft is returned
    (the UI still shows it) rather than a translation we cannot vouch for.
    """
    if lang == i18n.DEFAULT:
        return answer_en
    try:
        prompt = llm.load_prompt("render").format(language=i18n.LANGUAGES[lang].name, answer=answer_en)
        reply, truncated = llm.complete_ex([{"role": "user", "content": prompt}])
        local = grounding.complete_sentences((reply.content or "").strip())
    except llm.LLMUnavailable as exc:
        log.info("render fell back to English (%s)", exc)
        return answer_en
    if truncated:
        log.warning("render was cut off by the token limit; using the English draft")
        return answer_en
    if sorted(grounding.numbers_in(local, strip_dates=False)) != sorted(grounding.numbers_in(answer_en, strip_dates=False)):
        log.warning("render changed the numbers; using the English draft")
        return answer_en
    return local
