"""Planning endpoints (stock plan, new-branch suggestion). Read-only, scoped to the signed-in merchant, and off unless
FEATURE_PLAN is set, so they answer 404 and change nothing in a deployment that has not turned them on."""
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps import i18n
from apps.tools.plan import expansion_plan, stock_plan


def _language(request):
    code = request.query_params.get("language")
    return code if code in i18n.codes() else None


def _off():
    return Response({"error": {"code": "not_found", "message": "Not found."}}, status=404)


@api_view(["GET"])
def status(request):
    return Response({"enabled": bool(settings.FEATURE_PLAN)})


@api_view(["GET"])
def stock(request):
    if not settings.FEATURE_PLAN:
        return _off()
    return Response(stock_plan(request.user.merchant_id, category=request.query_params.get("category"), language=_language(request)))


@api_view(["GET"])
def expansion(request):
    if not settings.FEATURE_PLAN:
        return _off()
    return Response(expansion_plan(request.user.merchant_id, category=request.query_params.get("category"), language=_language(request)))
