"""The merchants created by seed_demo. Lakshmi carries the five planted stories; the second shop is plain data that
proves tenant isolation and a different language."""
from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class Profile:
    id: int
    name: str
    category: str
    city: str
    phone: str
    language: str
    seed: int
    prefix: str  # keeps customer hashes distinct between merchants
    stories: bool
    base_daily: int
    regulars: int
    lapsed: int


def demo_merchants():
    return [
        Profile(id=1, name="Lakshmi Kirana", category="Grocery store", city="Kukatpally, Hyderabad", phone="9876500001",
                language=settings.MERCHANT_LANGUAGE, seed=settings.SEED, prefix="a", stories=True, base_daily=9300,
                regulars=250, lapsed=40),
        Profile(id=2, name="Sharma Provision Store", category="Grocery store", city="Karol Bagh, Delhi", phone="9876500002",
                language="hi-IN", seed=settings.SEED + 1, prefix="b", stories=False, base_daily=6800,
                regulars=140, lapsed=18),
    ]
