from django.core.management.base import BaseCommand

from apps.agents import briefing
from apps.core.models import Merchant


class Command(BaseCommand):
    help = "Pre-generate each merchant's daily briefing (text + audio) for DEMO_TODAY in their own language."

    def handle(self, *args, **options):
        for merchant in Merchant.objects.order_by("id"):
            result = briefing.generate(merchant.id, merchant.language)
            audio = result["audio_url"] or "no audio (speech provider unavailable; text only)"
            self.stdout.write(f"{merchant.name} ({merchant.language}): {audio}")
        self.stdout.write(self.style.SUCCESS("briefings ready"))
