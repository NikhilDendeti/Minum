from django.db import models


class Merchant(models.Model):
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=60)
    city = models.CharField(max_length=60)
    phone = models.CharField(max_length=10, unique=True)  # 10-digit mobile number; the login identity
    language = models.CharField(max_length=5, default="en-IN")  # preferred language, validated against apps.i18n
    onboarded_on = models.DateField()
    # Forecast inputs calibrated by seed_demo (see docs/IMPLEMENTATION_PLAN.md R3/R4).
    cash_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    operating_cost_ratio = models.DecimalField(max_digits=5, decimal_places=4, default=0.78)

    class Meta:
        db_table = "merchants"

    def __str__(self):
        return self.name


class Settlement(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="settlements")
    date = models.DateField()
    gross = models.DecimalField(max_digits=12, decimal_places=2)
    mdr_fee = models.DecimalField(max_digits=12, decimal_places=2)
    refunds = models.DecimalField(max_digits=12, decimal_places=2)
    chargebacks = models.DecimalField(max_digits=12, decimal_places=2)
    net = models.DecimalField(max_digits=12, decimal_places=2)  # gross - mdr_fee - refunds - chargebacks
    credited_on = models.DateField()

    class Meta:
        db_table = "settlements"
        indexes = [models.Index(fields=["merchant", "date"])]


class Transaction(models.Model):
    MODES = [("upi", "upi"), ("card", "card"), ("wallet", "wallet")]
    STATUSES = [("success", "success"), ("refund", "refund"), ("failed", "failed")]

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="transactions")
    ts = models.DateTimeField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    customer_hash = models.CharField(max_length=16)
    mode = models.CharField(max_length=8, choices=MODES)
    status = models.CharField(max_length=8, choices=STATUSES)
    settlement = models.ForeignKey(Settlement, null=True, blank=True, on_delete=models.SET_NULL, related_name="transactions")

    class Meta:
        db_table = "transactions"
        indexes = [models.Index(fields=["merchant", "ts"])]


class Customer(models.Model):
    customer_hash = models.CharField(max_length=16)  # unique per merchant, not globally
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="customers")
    first_seen = models.DateField()
    last_seen = models.DateField()
    visit_count = models.IntegerField()
    total_spend = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "customers"
        constraints = [models.UniqueConstraint(fields=["merchant", "customer_hash"], name="uniq_customer_per_merchant")]


class Obligation(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="obligations")
    label = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_on = models.DateField()
    paid = models.BooleanField(default=False)

    class Meta:
        db_table = "obligations"


class Offer(models.Model):
    TYPES = [("credit", "credit"), ("promo", "promo"), ("stock", "stock")]
    STATUSES = [("proposed", "proposed"), ("approved", "approved"), ("rejected", "rejected"), ("sent", "sent")]

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="offers")
    type = models.CharField(max_length=8, choices=TYPES)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=STATUSES, default="proposed")
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_via = models.CharField(max_length=5, null=True, blank=True, choices=[("tap", "tap"), ("voice", "voice")])

    class Meta:
        db_table = "offers"


class OtpChallenge(models.Model):
    """A one-time login code sent to a merchant's phone. Only a hash of the code is stored."""

    phone = models.CharField(max_length=10, db_index=True)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    used = models.BooleanField(default=False)

    class Meta:
        db_table = "otp_challenges"


class Conversation(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="conversations")
    ts = models.DateTimeField(auto_now_add=True)
    transcript = models.TextField()
    language = models.CharField(max_length=5)
    intent = models.CharField(max_length=20, blank=True, default="")
    agent = models.CharField(max_length=20, blank=True, default="")
    sql = models.TextField(blank=True, default="")
    rows = models.JSONField(default=list)
    answer_en = models.TextField(blank=True, default="")
    answer_local = models.TextField(blank=True, default="")
    latency_ms = models.JSONField(default=dict)

    class Meta:
        db_table = "conversations"
