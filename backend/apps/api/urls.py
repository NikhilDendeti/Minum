from django.urls import path

from . import plan_views, views

urlpatterns = [
    path("health", views.health),
    path("auth/demo-accounts", views.demo_accounts),
    path("auth/request-otp", views.request_otp),
    path("auth/verify", views.verify),
    path("auth/logout", views.logout),
    path("me", views.me),
    path("briefing", views.briefing),
    path("ask", views.ask),
    path("forecast", views.forecast_view),
    path("growth", views.growth_view),
    path("offers/<int:offer_id>/decide", views.decide),
    path("conversations/<int:conversation_id>", views.conversation),
    path("suggestions", views.suggestions),
    path("reset", views.reset),
    path("plan/status", plan_views.status),
    path("plan/stock", plan_views.stock),
    path("plan/expansion", plan_views.expansion),
]
