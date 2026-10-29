import re

from django.conf import settings
from django.http import Http404
from django.views.static import serve

_OWNER = re.compile(r"^m(\d+)/")


def serve_media(request, path):
    """Audio and cached briefings live under media/m<merchant id>/ and are only served to that merchant's session.

    A different merchant (or no session) gets a plain 404, so file names cannot be probed.
    """
    owner = _OWNER.match(path)
    session_merchant = request.session.get("merchant_id")
    if not owner or session_merchant is None or int(owner.group(1)) != int(session_merchant):
        raise Http404("not found")
    response = serve(request, path, document_root=settings.MEDIA_ROOT)
    response["Cache-Control"] = "private, max-age=3600"
    return response
