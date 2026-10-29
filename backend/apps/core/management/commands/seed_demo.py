from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.core import seeding


class Command(BaseCommand):
    help = "Truncate all tables and regenerate six months of data with the five planted stories (seed 42)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="run even when DEMO_MODE is off (this DELETES all data)")

    def handle(self, *args, **options):
        if not settings.DEMO_MODE and not options["force"]:
            raise CommandError("seed_demo truncates every table. DEMO_MODE is off, so it refuses to run (use --force to override).")
        result = seeding.run()
        for line in result["stories"]:
            self.stdout.write(line)
        self.stdout.write(self.style.SUCCESS(f"seed_demo finished in {result['seconds']}s"))
