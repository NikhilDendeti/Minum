"""The merchants created by seed_demo.

Lakshmi (id 1) carries the five planted stories and Sharma (id 2) is plain data; both are generated exactly as before
so the stories never move. Ids 3 to 6 are richer shops (other categories, cities, languages, ticket sizes, opening
hours, weekly shapes and cash positions) that exercise the product on data it was not tuned for.
Every new field defaults to the original behaviour, so a Profile that sets none of them is generated unchanged.
"""
from dataclasses import dataclass
from datetime import date

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
    # --- shape of the shop; None means "use the generator's original value" ---
    days: int | None = None  # history length
    mean_ticket: int | None = None
    sigma: float | None = None
    weekday_factor: dict | None = None  # Monday=0 .. Sunday=6
    hours_weekday: dict | None = None
    hours_weekend: dict | None = None
    mode_p: tuple | None = None  # (upi, card, wallet)
    gap_mean: float | None = None  # days between a regular's visits
    month_start_boost: float = 0.0  # extra sales in the first five days of a month (salary week)
    festivals: tuple = ()  # ((date, factor), ...)
    refund_p: float = 0.10  # chance of one refund on a day
    min_txns: int = 30  # a shop never rings up fewer payments than this on a day
    # --- cash position: "legacy" keeps the original rules for ids 1 and 2 ---
    cash: str = "legacy"  # legacy | comfortable | tight
    rent: int = 0
    supplier: str = ""
    supplier_amount: int = 0
    supplier_due_days: int = 9
    daily_net: int = 0  # tight: target daily net inflow
    min_balance: int = 0  # tight: lowest projected balance (negative)


def demo_merchants():
    return [
        Profile(id=1, name="Lakshmi Kirana", category="Grocery store", city="Kukatpally, Hyderabad", phone="9876500001",
                language=settings.MERCHANT_LANGUAGE, seed=settings.SEED, prefix="a", stories=True, base_daily=9300,
                regulars=250, lapsed=40),
        Profile(id=2, name="Sharma Provision Store", category="Grocery store", city="Karol Bagh, Delhi", phone="9876500002",
                language="hi-IN", seed=settings.SEED + 1, prefix="b", stories=False, base_daily=6800,
                regulars=140, lapsed=18),
        # Pharmacy: big tickets, card-heavy, steady refills, morning and evening peaks, busy at month start
        Profile(id=3, name="Sai Ram Medicals", category="Pharmacy", city="Andheri West, Mumbai", phone="9876500003",
                language="hi-IN", seed=settings.SEED + 6, prefix="c", stories=False, base_daily=13500, regulars=300,
                lapsed=22, days=270, mean_ticket=240, sigma=0.75,
                weekday_factor={0: 1.05, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.05, 5: 1.0, 6: 0.8},
                hours_weekday={8: .7, 9: 1.0, 10: .9, 11: .8, 12: .7, 13: .6, 14: .6, 15: .7, 16: .8, 17: .9, 18: 1.0,
                               19: 1.0, 20: .9, 21: .6},
                hours_weekend={9: .8, 10: .9, 11: .9, 12: .8, 13: .6, 14: .5, 15: .6, 16: .8, 17: .9, 18: 1.0, 19: .9, 20: .7},
                mode_p=(0.62, 0.32, 0.06), gap_mean=11.0, month_start_boost=0.18, refund_p=0.06,
                cash="comfortable", rent=32000, supplier="Supplier payment - Apollo Distributors", supplier_amount=70000,
                supplier_due_days=12),
        # Tea and tiffin stall: tiny tickets, wallet-heavy, breakfast rush, tight cash before a supplier payment
        Profile(id=4, name="Venkat Tiffins & Tea", category="Tea and tiffin stall", city="Secunderabad", phone="9876500004",
                language="te-IN", seed=settings.SEED + 14, prefix="d", stories=False, base_daily=3300, regulars=140,
                lapsed=12, days=200, mean_ticket=38, sigma=0.5,
                weekday_factor={0: 1.1, 1: 1.05, 2: 1.0, 3: 1.0, 4: 1.0, 5: 0.9, 6: 0.7},
                hours_weekday={6: 1.0, 7: 1.0, 8: 1.0, 9: .8, 10: .5, 11: .4, 12: .5, 13: .4, 14: .3, 15: .5, 16: .8, 17: 1.0,
                               18: .9, 19: .5},
                hours_weekend={7: .8, 8: 1.0, 9: .9, 10: .6, 16: .6, 17: .8, 18: .7},
                mode_p=(0.7, 0.0, 0.3), gap_mean=3.0, refund_p=0.03, festivals=((date(2026, 10, 20), 1.35),),
                cash="tight", rent=9000, supplier="Supplier payment - Lakshmi Dairy", supplier_amount=26000,
                supplier_due_days=8, daily_net=900, min_balance=-6500),
        # Salon: weekend-heavy, long gaps between visits, high tickets, comfortable cash
        Profile(id=5, name="Glow Unisex Salon", category="Salon", city="Indiranagar, Bengaluru", phone="9876500005",
                language="en-IN", seed=settings.SEED + 16, prefix="e", stories=False, base_daily=10500, regulars=170,
                lapsed=28, days=270, mean_ticket=520, sigma=0.55, min_txns=8,
                weekday_factor={0: 0.5, 1: 0.7, 2: 0.9, 3: 1.0, 4: 1.2, 5: 1.7, 6: 1.6},
                hours_weekday={11: .6, 12: .8, 13: .7, 14: .6, 15: .8, 16: 1.0, 17: 1.0, 18: 1.0, 19: .9, 20: .5},
                hours_weekend={10: .8, 11: 1.0, 12: 1.0, 13: .9, 14: .8, 15: 1.0, 16: 1.0, 17: 1.0, 18: .9, 19: .7},
                mode_p=(0.55, 0.38, 0.07), gap_mean=16.0, refund_p=0.04,
                cash="comfortable", rent=45000, supplier="Supplier payment - Salon Supplies Co", supplier_amount=30000,
                supplier_due_days=10),
        # Vegetable stall: early market hours, Sunday and festival spikes, thin margins and a tight month
        Profile(id=6, name="Raju Fresh Vegetables", category="Fruit and vegetable stall", city="Mehdipatnam, Hyderabad",
                phone="9876500006", language="te-IN", seed=settings.SEED + 5, prefix="f", stories=False, base_daily=7200,
                regulars=190, lapsed=30, days=200, mean_ticket=85, sigma=0.6,
                weekday_factor={0: 0.9, 1: 0.9, 2: 0.95, 3: 1.0, 4: 1.05, 5: 1.3, 6: 1.6},
                hours_weekday={6: 1.0, 7: 1.0, 8: .9, 9: .7, 10: .5, 11: .3, 16: .6, 17: 1.0, 18: 1.0, 19: .7},
                hours_weekend={6: 1.0, 7: 1.0, 8: 1.0, 9: .9, 10: .7, 11: .5, 16: .6, 17: .9, 18: .8},
                mode_p=(0.9, 0.0, 0.1), gap_mean=3.5, refund_p=0.02,
                festivals=((date(2026, 10, 20), 1.7), (date(2026, 10, 2), 1.3)),
                cash="tight", rent=12000, supplier="Supplier payment - Mehdipatnam Market Traders", supplier_amount=34000,
                supplier_due_days=6, daily_net=1100, min_balance=-9000),
    ]
