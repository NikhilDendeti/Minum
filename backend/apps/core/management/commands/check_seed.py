from django.core.management.base import BaseCommand, CommandError

from apps.core import quality


class Command(BaseCommand):
    help = "Run the data-quality checks against the seeded database and exit non-zero if any fail."

    def handle(self, *args, **options):
        problems = quality.check()
        if problems:
            raise CommandError("data quality failed:\n  - " + "\n  - ".join(problems))
        self.stdout.write(self.style.SUCCESS("seed data passes every quality check"))
