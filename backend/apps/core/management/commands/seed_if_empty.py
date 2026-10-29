from django.conf import settings
from django.core.management.base import BaseCommand

from apps.agents import briefing
from apps.core import seeding
from apps.core.models import Merchant


class Command(BaseCommand):
    help = ("First-deploy convenience: if the database has no merchants and DEMO_MODE is on, load the demo data and build "
            "the briefings. Otherwise do nothing, so a redeploy never wipes anything.")

    def handle(self, *args, **options):
        if Merchant.objects.exists():
            self.stdout.write("data already present: nothing to seed")
            return
        if not settings.DEMO_MODE:
            self.stdout.write("database is empty but DEMO_MODE is off: not seeding demo data")
            return
        result = seeding.run()
        for merchant in Merchant.objects.order_by("id"):
            briefing.generate(merchant.id, merchant.language)
        self.stdout.write(self.style.SUCCESS(f"demo data loaded in {result['seconds']}s"))
