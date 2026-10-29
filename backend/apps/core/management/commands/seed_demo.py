from django.core.management.base import BaseCommand

from apps.core import seeding


class Command(BaseCommand):
    help = "Truncate all tables and regenerate six months of data with the five planted stories (seed 42)."

    def handle(self, *args, **options):
        result = seeding.run()
        for line in result["stories"]:
            self.stdout.write(line)
        self.stdout.write(self.style.SUCCESS(f"seed_demo finished in {result['seconds']}s"))
