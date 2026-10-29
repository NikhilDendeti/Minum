import re

from django.conf import settings
from django.db import connections, transaction

from .util import jsonable, logged

MAX_ROWS = 50
FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|vacuum|reset|"
    r"pg_sleep|pg_read_file|lo_import|lo_export|dblink|set_config|current_setting|into)\b", re.I)


class SqlRejected(ValueError):
    pass


def check_query(query):
    q = (query or "").strip().rstrip(";").strip()
    if not q:
        raise SqlRejected("empty query")
    if ";" in q:
        raise SqlRejected("only one statement is allowed")
    if "--" in q or "/*" in q:
        raise SqlRejected("comments are not allowed")
    if not re.match(r"(?is)^\s*(select|with)\b", q):
        raise SqlRejected("only SELECT queries are allowed")
    bad = FORBIDDEN.search(q)
    if bad:
        raise SqlRejected(f"keyword not allowed: {bad.group(1)}")
    return q


@logged
def run_sql(merchant_id, query):
    """Run one SELECT for one merchant on the read-only alias: 50-row cap, 3 s statement timeout.

    The query runs inside a transaction that sets `app.merchant_id`; row-level security then hides every other
    merchant's rows from the read-only role. Raises SqlRejected for anything that is not a single SELECT/WITH;
    database errors propagate so the agent can retry once with the message.
    """
    q = check_query(query)
    alias = settings.READONLY_ALIAS
    with transaction.atomic(using=alias):
        with connections[alias].cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '3s'")
            cur.execute("SELECT set_config('app.merchant_id', %s, true)", [str(int(merchant_id))])
            cur.execute(f"SELECT * FROM ({q}) AS munim_q LIMIT {MAX_ROWS + 1}")
            columns = [c.name for c in cur.description]
            fetched = cur.fetchall()
    rows = [dict(zip(columns, [jsonable(v) for v in r])) for r in fetched[:MAX_ROWS]]
    return {"columns": columns, "rows": rows, "row_count": len(rows), "truncated": len(fetched) > MAX_ROWS}
