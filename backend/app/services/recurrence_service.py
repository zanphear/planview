"""
Recurring task expansion.

Supports simple RRULE-like strings:
  FREQ=DAILY;INTERVAL=1
  FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR
  FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15
  FREQ=YEARLY;INTERVAL=1

Optional: COUNT=10 or UNTIL=2026-12-31
"""
from datetime import date, timedelta
from typing import Generator


def _parse_rule(rule: str) -> dict[str, str]:
    parts = {}
    for part in rule.split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            parts[k.strip().upper()] = v.strip()
    return parts


_WEEKDAY_MAP = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def expand_recurrence(
    rule: str,
    start: date,
    range_start: date,
    range_end: date,
    duration_days: int = 0,
) -> Generator[tuple[date, date], None, None]:
    """
    Yield (date_from, date_to) pairs for each occurrence within [range_start, range_end].
    """
    parts = _parse_rule(rule)
    freq = parts.get("FREQ", "WEEKLY")
    interval = int(parts.get("INTERVAL", "1"))
    count = int(parts["COUNT"]) if "COUNT" in parts else None
    until = date.fromisoformat(parts["UNTIL"]) if "UNTIL" in parts else None
    byday = parts.get("BYDAY", "").split(",") if "BYDAY" in parts else []
    bymonthday = int(parts["BYMONTHDAY"]) if "BYMONTHDAY" in parts else None

    generated = 0
    current = start

    # Cap at 2 years out for safety
    hard_limit = range_end + timedelta(days=1)
    if until and until < hard_limit:
        hard_limit = until

    while current <= hard_limit:
        if count is not None and generated >= count:
            break

        occ_end = current + timedelta(days=duration_days)

        # Check if this occurrence overlaps the query range
        if occ_end >= range_start and current <= range_end:
            yield current, occ_end
            generated += 1
        elif current > range_end:
            break

        # Advance
        if freq == "DAILY":
            current += timedelta(days=interval)
        elif freq == "WEEKLY":
            if byday:
                # Find next matching weekday
                target_days = sorted(_WEEKDAY_MAP[d] for d in byday if d in _WEEKDAY_MAP)
                if not target_days:
                    current += timedelta(weeks=interval)
                    continue
                current_wd = current.weekday()
                # Find next target day in current or next cycle
                found = False
                for td in target_days:
                    if td > current_wd:
                        current += timedelta(days=td - current_wd)
                        found = True
                        break
                if not found:
                    # Jump to first target day of next interval week
                    days_to_monday = 7 - current_wd
                    current += timedelta(days=days_to_monday + 7 * (interval - 1) + target_days[0])
            else:
                current += timedelta(weeks=interval)
        elif freq == "MONTHLY":
            month = current.month + interval
            year = current.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = bymonthday or current.day
            # Clamp day to month length
            import calendar
            max_day = calendar.monthrange(year, month)[1]
            day = min(day, max_day)
            current = date(year, month, day)
        elif freq == "YEARLY":
            try:
                current = current.replace(year=current.year + interval)
            except ValueError:
                # Feb 29 in non-leap year
                current = current.replace(year=current.year + interval, day=28)
        else:
            break
