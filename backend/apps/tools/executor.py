"""Simulated executors: they only update Offer.status and log a line. No message is sent, no money moves."""
import logging

from apps.core.models import Offer

from .util import logged

log = logging.getLogger("munim.executor")


@logged
def send_promo(offer_id):
    offer = Offer.objects.get(pk=offer_id)
    offer.status = "sent"
    offer.save(update_fields=["status"])
    log.info("SIMULATED promo send offer=%s reach=%s", offer_id, offer.payload.get("reach"))
    return {"status": "sent", "simulated": True}


@logged
def disburse_credit(offer_id):
    offer = Offer.objects.get(pk=offer_id)
    offer.status = "approved"
    offer.save(update_fields=["status"])
    log.info("SIMULATED credit disbursal offer=%s amount=%s", offer_id, offer.payload.get("amount"))
    return {"status": "approved", "simulated": True}


@logged
def set_reminder(offer_id):
    offer = Offer.objects.get(pk=offer_id)
    offer.status = "approved"
    offer.save(update_fields=["status"])
    log.info("SIMULATED restock reminder offer=%s date=%s", offer_id, offer.payload.get("date"))
    return {"status": "approved", "simulated": True}
