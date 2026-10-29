"""SMS delivery of login codes. The prototype only logs; plug a provider (MSG91, Twilio, Paytm's own gateway) in here."""
import logging

log = logging.getLogger("munim.sms")


def send(phone, code):
    log.info("SIMULATED SMS to %s***%s: login code sent", phone[:2], phone[-3:])  # never log the code itself
