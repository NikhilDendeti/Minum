"""Tests for the planning tools and their feature-gated endpoints. They run offline like the rest of the suite."""
from django.test import TestCase, override_settings

from apps.agents.tests import LAKSHMI, OFFLINE, SHARMA, login
from apps.core import seeding
from apps.core.models import Obligation
from apps.tools import plan_data
from apps.tools.plan import expansion_plan, payback_estimate, stock_plan


@override_settings(READONLY_ALIAS="default", **OFFLINE)
class PlanTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seeding.run()

    def test_calendar_is_well_formed(self):
        for e in plan_data.EVENTS:
            self.assertLessEqual(e["start"], e["end"], e["id"])
            self.assertEqual(set(e["names"]), set(plan_data.LANGS), e["id"])
        for key, items in plan_data.CATALOG.items():
            self.assertIn(key, plan_data.CATEGORY_LABELS)
            for sku, names, unit, per10k, tags in items:
                self.assertEqual(len(names), 3, sku)
                self.assertIn(unit, plan_data.UNIT_LABELS, sku)
                self.assertGreater(per10k, 0, sku)

    def test_stock_plan_covers_three_days_and_adds_up(self):
        plan = stock_plan(1)
        self.assertTrue(plan["available"])
        self.assertEqual([d["date"] for d in plan["days"]], ["2026-11-13", "2026-11-14", "2026-11-15"])
        self.assertTrue(plan["items"])
        for item in plan["items"]:
            self.assertEqual(len(item["per_day"]), 3)
            self.assertEqual(item["total"], sum(item["per_day"]))
        self.assertEqual(plan, stock_plan(1))  # deterministic

    def test_events_follow_the_shops_region(self):
        hyderabad = {e["id"] for d in stock_plan(1)["days"] for e in d["events"]}
        delhi = {e["id"] for d in stock_plan(2)["days"] for e in d["events"]}
        self.assertNotIn("chhath", hyderabad)
        self.assertIn("childrens_day", hyderabad)
        self.assertIn("chhath", delhi)

    def test_festival_uplift_raises_the_right_items_on_the_right_day(self):
        items = {i["sku"]: i for i in stock_plan(1)["items"]}
        biscuits = items["biscuits"]
        self.assertTrue(biscuits["boosted"])
        self.assertEqual(biscuits["reasons"][0]["day"], 1)  # Saturday 14 Nov, Children's Day
        self.assertEqual(biscuits["reasons"][0]["pct"], 30)
        self.assertFalse(items["rice"]["boosted"])

    def test_names_follow_the_merchants_language(self):
        self.assertEqual(stock_plan(1)["items"][0]["name"], "బిస్కెట్లు")  # Lakshmi: Telugu
        self.assertIn("किलो", {i["unit_label"] for i in stock_plan(2)["items"]})  # Sharma: Hindi

    def test_another_shop_type_can_be_tried(self):
        plan = stock_plan(1, category="pooja")
        self.assertEqual(plan["category"], "pooja")
        self.assertTrue(any(u["id"] == "dev_deepavali" for u in plan["upcoming"]))
        self.assertEqual(stock_plan(1, category="not-a-type")["category"], "grocery")  # unknown values are ignored

    def test_expansion_map_is_complete_stable_and_ranked(self):
        plan = expansion_plan(1)
        self.assertTrue(plan["available"])
        self.assertEqual(len(plan["cells"]), plan["grid"] ** 2)
        self.assertEqual(sum(1 for c in plan["cells"] if c["you"]), 1)
        self.assertEqual([t["rank"] for t in plan["top"]], [1, 2, 3])
        cells = {(c["row"], c["col"]): c for c in plan["cells"]}
        scores = [cells[(t["row"], t["col"])]["score"] for t in plan["top"]]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertFalse(any(cells[(t["row"], t["col"])]["you"] for t in plan["top"]))
        self.assertEqual(plan["cells"], expansion_plan(1)["cells"])
        self.assertNotEqual(plan["cells"], expansion_plan(2)["cells"])

    def test_endpoints_are_off_unless_the_feature_is_on(self):
        client = login(LAKSHMI)
        self.assertEqual(client.get("/api/plan/status").json(), {"enabled": False})
        for path in ("/api/plan/stock", "/api/plan/expansion"):
            self.assertEqual(client.get(path).status_code, 404, path)

    @override_settings(FEATURE_PLAN=True)
    def test_endpoints_work_when_on_and_stay_private(self):
        client = login(LAKSHMI)
        self.assertEqual(client.get("/api/plan/status").json(), {"enabled": True})
        stock = client.get("/api/plan/stock").json()
        self.assertTrue(stock["available"] and stock["simulated"])
        self.assertTrue(client.get("/api/plan/expansion").json()["available"])
        other = login(SHARMA).get("/api/plan/stock").json()
        self.assertEqual(other["category_label"], "किराना दुकान")  # each merchant sees only their own plan
        self.assertEqual(client.get("/api/plan/stock?category=pooja").json()["category"], "pooja")
        self.assertEqual(client.get("/api/plan/stock?language=hi-IN").json()["category_label"], "किराना दुकान")  # follows the header language
        self.assertEqual(client.get("/api/plan/stock?language=xx").json()["category_label"], "కిరాణా దుకాణం")  # unknown: the saved language
        from rest_framework.test import APIClient
        self.assertEqual(APIClient().get("/api/plan/stock").status_code, 401)

    # --- payback estimate for the new-branch suggestion ---------------------------------------------------------------
    def test_payback_maths_for_a_known_input(self):
        # spend 225,000 with no shop yet, grocery margin 22%, rent 18,000:
        #   sales 135,000, profit 29,700 - 18,000 = 11,700 (shown as 11,500), setup 54,000 + 45,000 + 100,000 = 199,000 (200,000)
        e = payback_estimate(225000, 0, 0.22, 18000)
        self.assertEqual(e["expected_monthly_sales"], 135000)
        self.assertEqual(e["expected_monthly_profit"], 11500)
        self.assertEqual(e["setup_cost"], 200000)
        self.assertEqual(e["payback_months"], 17.4)
        self.assertEqual(e["verdict"], "recommended")
        self.assertTrue(e["can_request"])
        self.assertEqual(payback_estimate(400000, 1, 0.22, 18000)["verdict"], "slow")  # about 23 months: shown, but no action

    def test_a_loss_is_not_recommended_and_has_no_payback(self):
        e = payback_estimate(225000, 0, 0.10, 18000)  # the first-draft grocery margin: profit is below zero after rent
        self.assertLess(e["expected_monthly_profit"], 0)
        self.assertIsNone(e["payback_months"])
        self.assertEqual(e["verdict"], "not_recommended")
        self.assertFalse(e["can_request"])

    def test_estimates_are_added_without_moving_the_ranking(self):
        top = expansion_plan(1)["top"]
        self.assertEqual([t["rank"] for t in top], [1, 2, 3])
        self.assertEqual([t["spend"] for t in top], [225000, 400000, 545000])  # the order and figures shown before
        self.assertEqual([t["shops"] for t in top], [0, 1, 2])
        self.assertEqual([t["distance_m"] for t in top], [2100, 1600, 1400])
        for t in top:
            self.assertEqual(t["payback_months"], round(t["setup_cost"] / t["expected_monthly_profit"], 1))

    def test_numbers_are_sane_for_lakshmi_and_venkat(self):
        for merchant_id in (1, 4):
            for t in expansion_plan(merchant_id)["top"]:
                self.assertIsNotNone(t["payback_months"], (merchant_id, t))
                self.assertTrue(3 <= t["payback_months"] <= 36, (merchant_id, t["payback_months"]))
        self.assertTrue(any(t["can_request"] for t in expansion_plan(1)["top"]))  # Lakshmi has an area worth requesting for

    def test_rent_comes_from_the_merchants_own_obligations_else_the_default(self):
        own = expansion_plan(1)["assumptions"]
        self.assertEqual((own["rent"], own["rent_source"]), (18000, "own"))
        Obligation.objects.filter(merchant_id=1, label="Shop rent").delete()
        fallback = expansion_plan(1)["assumptions"]
        self.assertEqual((fallback["rent"], fallback["rent_source"]), (15000, "assumed"))

