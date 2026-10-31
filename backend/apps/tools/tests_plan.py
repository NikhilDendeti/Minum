"""Tests for the planning tools and their feature-gated endpoints. They run offline like the rest of the suite."""
from django.test import TestCase, override_settings

from apps.agents.tests import LAKSHMI, OFFLINE, SHARMA, login
from apps.core import seeding
from apps.tools import plan_data
from apps.tools.plan import expansion_plan, stock_plan


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
