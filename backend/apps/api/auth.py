"""Mobile number + one-time code login, stored in a signed session cookie.

Why a cookie and not a bearer token: the browser's <audio> element cannot send an Authorization header, and
audio files must be protected too. The frontend is served same-origin (Vite proxies /api and /media), so the
HttpOnly cookie travels with every request. State-changing requests are CSRF-protected (SessionAuthentication).
"""
import hashlib
import hmac
import logging
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission

from apps.core.models import Merchant, OtpChallenge

log = logging.getLogger("munim.auth")


class Principal:
    """The logged-in merchant, as DRF's request.user."""

    is_authenticated = True

    def __init__(self, merchant_id):
        self.merchant_id = merchant_id
        self.pk = merchant_id


class MerchantSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        merchant_id = request._request.session.get("merchant_id")
        if not merchant_id:
            return None
        self.enforce_csrf(request)
        return Principal(merchant_id), None

    def authenticate_header(self, request):
        return "Session"  # makes DRF answer 401 (not 403) when there is no session


class IsMerchant(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Principal)


class OtpError(Exception):
    def __init__(self, code, status):
        super().__init__(code)
        self.code, self.status = code, status


def normalise_phone(raw):
    digits = re.sub(r"\D", "", raw or "")
    return digits[-10:] if len(digits) >= 10 else ""


def _hash(phone, code):
    return hmac.new(settings.SECRET_KEY.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_otp(phone):
    """Create a code for a known merchant and 'send' it. Unknown numbers get the same reply (no account probing).

    Returns the code only in DEMO_MODE (shown on the login screen); otherwise it goes out by SMS (apps.api.sms).
    """
    from . import sms

    now = timezone.now()
    if OtpChallenge.objects.filter(phone=phone, created_at__gte=now - timedelta(minutes=10)).count() >= settings.OTP_MAX_REQUESTS:
        raise OtpError("too_many_attempts", 429)
    result = {"sent": True}
    if not Merchant.objects.filter(phone=phone).exists():
        return result
    code = settings.DEMO_OTP if settings.DEMO_MODE else f"{secrets.randbelow(10 ** 6):06d}"
    OtpChallenge.objects.create(phone=phone, code_hash=_hash(phone, code), expires_at=now + timedelta(seconds=settings.OTP_TTL_S))
    sms.send(phone, code)
    if settings.DEMO_MODE:
        result["dev_otp"] = code
    return result


def verify_otp(phone, code):
    """Return the Merchant for a correct, unexpired, unused code; otherwise raise OtpError."""
    challenge = (OtpChallenge.objects.filter(phone=phone, used=False, expires_at__gt=timezone.now()).order_by("-id").first())
    if challenge is None:
        raise OtpError("invalid_otp", 400)
    if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise OtpError("too_many_attempts", 429)
    challenge.attempts += 1
    if not hmac.compare_digest(challenge.code_hash, _hash(phone, str(code or "").strip())):
        challenge.save(update_fields=["attempts"])
        raise OtpError("invalid_otp", 400)
    challenge.used = True
    challenge.save(update_fields=["attempts", "used"])
    return Merchant.objects.get(phone=phone)
