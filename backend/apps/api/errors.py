from rest_framework.views import exception_handler

from apps import i18n
from apps.agents import templates

CODES = {400: "bad_request", 401: "unauthenticated", 403: "forbidden", 404: "not_found", 405: "method_not_allowed",
         415: "unsupported_media_type", 429: "throttled"}


def api_exception_handler(exc, context):
    """Render DRF's own errors (401, 403, 404...) in the same {"error": {...}} shape as the views' errors."""
    response = exception_handler(exc, context)
    if response is None:
        return None
    code = CODES.get(response.status_code, "server_error")
    lang = i18n.DEFAULT
    request = context.get("request")
    user = getattr(request, "user", None)
    if getattr(user, "merchant_id", None):
        from apps.core.models import Merchant

        lang = getattr(Merchant.objects.filter(pk=user.merchant_id).first(), "language", lang)
    detail = response.data.get("detail", str(exc)) if isinstance(response.data, dict) else str(exc)
    response.data = {"error": {"code": code, "message": str(detail), "message_local": templates.error_text(code, lang)}}
    return response
