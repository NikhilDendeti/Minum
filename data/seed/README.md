# Munim seed data

The complete synthetic dataset behind the demo: six merchants, six to nine months of payments each. It is the same data the app loads into Postgres.

**This data is synthetic.** It is not Paytm data and it is not taken from Kaggle or any other dataset. Real merchant data is private to Paytm, so we generate our own with a fixed random seed. Every run produces identical rows.

| File | Rows | What it holds |
| --- | ---: | --- |
| `merchants.csv` | 6 | The demo shops: name, category, city, language, phone |
| `transactions.csv` | 88,412 | Every payment attempt: time, amount, payer hash, mode (upi, card, wallet), status (success, refund, failed) |
| `settlements.csv` | 1,308 | One row per merchant per day: gross, fees, refunds, net, and the day the money was credited |
| `customers.csv` | 15,696 | One row per payer per merchant: first and last visit, visit count, total spend |
| `obligations.csv` | 72 | Rent, supplier payments and bills, paid and upcoming |

Amounts are in rupees. Times in `transactions.csv` carry the India offset (+05:30). Payers are hashes, never names or numbers.

## The merchants

| id | Merchant | Language | Transactions |
| ---: | --- | --- | ---: |
| 1 | Lakshmi Kirana, Kukatpally, Hyderabad (grocery) | Telugu | 17,570 |
| 2 | Sharma Provision Store, Karol Bagh, Delhi | Hindi | 12,886 |
| 3 | Sai Ram Medicals, Andheri West, Mumbai (pharmacy) | Hindi | 15,683 |
| 4 | Venkat Tiffins & Tea, Secunderabad | Telugu | 17,060 |
| 5 | Glow Unisex Salon, Indiranagar, Bengaluru | English | 6,265 |
| 6 | Raju Fresh Vegetables, Mehdipatnam, Hyderabad | Telugu | 18,948 |

Each shop has its own ticket size, opening hours, weekly rhythm and festival days. Only Lakshmi carries the five planted stories below. The other five exist to show the product works on data it was not tuned for.

## The five planted stories (Lakshmi, merchant 1)

| Story | Where to see it |
| --- | --- |
| Yesterday earned ₹8,200, 12% below the usual Wednesday | `settlements.csv`, merchant 1, date 2026-11-11: gross 8200. The previous four Wednesdays average 9,320. |
| A settlement ₹1,420 short | `settlements.csv`, merchant 1, date 2026-11-09: gross 9870, refunds 890, fees 530, net 8450 |
| Weekday evenings sell about 36% less than the lunch peak (the app quotes 37%, measured over the last 90 weekdays) | `transactions.csv`, merchant 1, weekdays, hours 18 to 20 against 11 to 12, per-hour average |
| 40 regular customers have not been back in 14 days or more | `customers.csv`, merchant 1: visit_count 5 or more and last_seen before 2026-10-29 |
| A cash gap on 19 Nov | `obligations.csv`, merchant 1: the ₹45,000 supplier payment due 2026-11-19 |

The cash balance and operating-cost ratio the forecast uses are set after loading and are not part of these files.

## How it is made and loaded

1. `backend/apps/core/seedgen.py` generates the rows from `numpy` with one seed per merchant. The shops are defined in `backend/apps/core/demo_merchants.py`.
2. `backend/apps/core/seeding.py` writes them into Postgres and checks that every planted number comes out exactly.
3. `python scripts/export_seed_data.py` rewrites these CSV files from the same generator. No database is needed.
