from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _grant_after_migrate(sender, using="default", **kwargs):
    if using != "default":
        return
    from .grants import grant_readonly

    grant_readonly(using)


class CoreConfig(AppConfig):
    name = "apps.core"
    label = "core"

    def ready(self):
        post_migrate.connect(_grant_after_migrate, sender=self)
