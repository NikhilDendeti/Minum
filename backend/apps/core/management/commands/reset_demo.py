from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.core import seeding


class Command(BaseCommand):
    help = ("Back to the start of the demo: reseed every demo merchant, delete all offers and conversations, "
            "and rebuild the cached briefings (text + audio). Same as POST /api/reset.")

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="run even when DEMO_MODE is off (this DELETES all data)")

    def handle(self, *args, **options):
        if not settings.DEMO_MODE and not options["force"]:
            raise CommandError("reset_demo wipes every table. DEMO_MODE is off, so it refuses to run (use --force to override).")
        result = seeding.reset_demo()
        self.stdout.write(self.style.SUCCESS(f"demo reset in {result['seconds']}s"))
