from django.urls import include, path, re_path

from apps.api.media import serve_media

urlpatterns = [
    path("api/", include("apps.api.urls")),
    re_path(r"^media/(?P<path>.*)$", serve_media),
]
