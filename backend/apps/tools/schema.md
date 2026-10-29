## Database schema (PostgreSQL, read-only, one merchant: merchant_id = 1)

All amounts are rupees. Timestamps are in Asia/Kolkata. Only status = 'success' rows count as sales.

- transactions(id, merchant_id, ts timestamptz, amount numeric, customer_hash text, mode 'upi'|'card'|'wallet', status 'success'|'refund'|'failed', settlement_id) : one row per payment attempt
- settlements(id, merchant_id, date, gross, mdr_fee, refunds, chargebacks, net, credited_on) : one row per day; net = gross - mdr_fee - refunds - chargebacks
- customers(customer_hash, merchant_id, first_seen date, last_seen date, visit_count int, total_spend) : one row per payer; "regular" = visit_count >= 5
- obligations(id, merchant_id, label, amount, due_on date, paid bool) : supplier payments, rent, bills
- offers(id, merchant_id, type 'credit'|'promo', payload json, status, created_at, decided_at, decided_via)
- merchants(id, name, category, city, language, onboarded_on)

Rules: write one SELECT (or WITH ... SELECT), no semicolons, no comments. Use ts::date for the calendar day and
EXTRACT(HOUR FROM ts) for the hour. Today in the demo is the DEMO_TODAY date given in the question context.

### Examples
1. Total sales on a day: `SELECT SUM(amount) AS sales FROM transactions WHERE status = 'success' AND ts::date = '2026-11-11'`
2. Busiest hours: `SELECT EXTRACT(HOUR FROM ts)::int AS hour, SUM(amount) AS sales FROM transactions WHERE status = 'success' GROUP BY 1 ORDER BY 2 DESC LIMIT 5`
3. Card vs UPI share: `SELECT mode, SUM(amount) AS sales, COUNT(*) AS txns FROM transactions WHERE status = 'success' AND ts::date >= '2026-10-13' GROUP BY mode`
4. Biggest refunds: `SELECT ts::date AS day, amount FROM transactions WHERE status = 'refund' ORDER BY amount DESC LIMIT 5`
5. Unpaid obligations: `SELECT label, amount, due_on FROM obligations WHERE paid = false ORDER BY due_on`
