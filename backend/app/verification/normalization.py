"""Conservative, injectable normalisation helpers for claims and fact records."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

try:  # Optional dependency; the offline fallback below remains authoritative enough for common forms.
    import dateparser as _dateparser  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - exercised in the default dependency set
    _dateparser = None


@dataclass(frozen=True, slots=True)
class NormalizedQuantity:
    """A comparable quantity in a canonical unit.

    ``value`` is canonical (minutes for time, INR for money, percent points for
    percentages).  ``raw_value``/``raw_unit`` retain what was present in the source.
    """

    value: Decimal
    unit: str | None
    dimension: str
    currency: str | None = None
    raw_value: Decimal | None = None
    raw_unit: str | None = None
    qualifier: str | None = None
    original: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "value": str(self.value),
            "unit": self.unit,
            "dimension": self.dimension,
            "currency": self.currency,
            "raw_value": str(self.raw_value) if self.raw_value is not None else None,
            "raw_unit": self.raw_unit,
            "qualifier": self.qualifier,
            "original": self.original,
        }


@dataclass(frozen=True, slots=True)
class DateRange:
    start: date
    end: date
    original: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "original": self.original,
        }


_QUALIFIER_RE = re.compile(
    r"\b(?P<qualifier>up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\b",
    re.IGNORECASE,
)
NUMBER_PATTERN = r"\d+(?:[, _]\d{2,3})*(?:\.\d+)?"
_NUMBER_RE = rf"(?P<number>{NUMBER_PATTERN})"
_PRICE_RE = re.compile(
    rf"(?<!\w)(?P<prefix>\$|€|£|₹|rs\.?|inr\.?|usd\.?|eur\.?|gbp\.?|rupees?|रु\.?)\s*{_NUMBER_RE}(?:\s*(?P<scale>lakh(?:s)?|lac(?:s)?|crore(?:s)?|cr))?(?!\w)",
    re.IGNORECASE,
)
_SUFFIX_PRICE_RE = re.compile(
    rf"(?<!\w){_NUMBER_RE}(?:(?:\s*(?P<scale>lakh(?:s)?|lac(?:s)?|crore(?:s)?|cr))(?:\s*(?:rupees?|inr|₹|usd|eur|gbp|\$|€|£))?|\s*(?:rupees?|inr|usd|eur|gbp|\$|€|£))(?!\w)",
    re.IGNORECASE,
)
_PERCENT_RE = re.compile(rf"(?<!\w){_NUMBER_RE}\s*(?:%|percent(?:age)?)(?!\w)", re.IGNORECASE)
_NUMBER_UNIT_RE = re.compile(
    rf"(?P<qualifier>(?:up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\s+)?"
    rf"{_NUMBER_RE}\s*(?P<unit>hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s|days?|weeks?|months?|years?|gb|tb|mb|kg|g|grams?|metres?|meters?|km|mi|miles?|°c|celsius|°f|fahrenheit)\b",
    re.IGNORECASE,
)
_BARE_NUMBER_RE = re.compile(rf"(?P<qualifier>(?:up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\s+)?{_NUMBER_RE}")

_TIME_UNITS = {
    "h": "minutes",
    "hr": "minutes",
    "hrs": "minutes",
    "hour": "minutes",
    "hours": "minutes",
    "m": "minutes",
    "min": "minutes",
    "mins": "minutes",
    "minute": "minutes",
    "minutes": "minutes",
    "s": "seconds",
    "sec": "seconds",
    "secs": "seconds",
    "second": "seconds",
    "seconds": "seconds",
}
_SCALE_FACTORS = {
    "lakh": Decimal("100000"),
    "lakhs": Decimal("100000"),
    "lac": Decimal("100000"),
    "lacs": Decimal("100000"),
    "crore": Decimal("10000000"),
    "crores": Decimal("10000000"),
    "cr": Decimal("10000000"),
}
_CURRENCY_ALIASES = {
    "$": "USD",
    "usd": "USD",
    "€": "EUR",
    "eur": "EUR",
    "£": "GBP",
    "gbp": "GBP",
    "₹": "INR",
    "inr": "INR",
    "rs": "INR",
    "rupee": "INR",
    "rupees": "INR",
    "रु": "INR",
}


def _decimal(raw: str | int | float | Decimal) -> Decimal | None:
    try:
        if isinstance(raw, str):
            raw = raw.replace(",", "").replace("_", "").strip()
        return Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        return None


def normalize_key(value: Any) -> str:
    """Normalise a fact key or term without attempting semantic inference."""

    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = text.replace("&", " and ")
    text = text.replace("_", " ")
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def _canonical_time(number: Decimal, unit: str) -> tuple[Decimal, str]:
    lowered = unit.casefold().rstrip(".")
    if lowered in {"h", "hr", "hrs", "hour", "hours"}:
        return number * Decimal(60), "minutes"
    if lowered in {"s", "sec", "secs", "second", "seconds"}:
        return number, "seconds"
    return number, "minutes"


def _quantity_from_parts(
    number: str | int | float | Decimal,
    unit: str | None,
    *,
    original: str | None = None,
    qualifier: str | None = None,
    currency: str | None = None,
    scale: str | None = None,
) -> NormalizedQuantity | None:
    if qualifier:
        qualifier = qualifier.strip()
    value = _decimal(number)
    if value is None:
        return None
    raw_unit = unit.casefold().strip().rstrip(".") if unit else None
    if raw_unit in _CURRENCY_ALIASES:
        currency = _CURRENCY_ALIASES[raw_unit]
    if raw_unit in _SCALE_FACTORS and not scale:
        scale = raw_unit
    if scale:
        factor = _SCALE_FACTORS.get(scale.casefold())
        if factor is not None:
            value *= factor
        return NormalizedQuantity(
            value=value,
            unit="INR",
            dimension="money",
            currency="INR",
            raw_value=_decimal(number),
            raw_unit=scale.casefold(),
            qualifier=qualifier,
            original=original,
        )
    if currency:
        return NormalizedQuantity(
            value=value,
            unit=currency.upper(),
            dimension="money",
            currency=currency.upper(),
            raw_value=value,
            raw_unit=raw_unit,
            qualifier=qualifier,
            original=original,
        )
    if raw_unit in {"%", "percent", "percentage"}:
        return NormalizedQuantity(
            value=value,
            unit="%",
            dimension="percentage",
            raw_value=value,
            raw_unit=raw_unit,
            qualifier=qualifier,
            original=original,
        )
    if raw_unit in _TIME_UNITS:
        canonical, canonical_unit = _canonical_time(value, raw_unit)
        return NormalizedQuantity(
            value=canonical,
            unit=canonical_unit,
            dimension="time",
            raw_value=value,
            raw_unit=raw_unit,
            qualifier=qualifier,
            original=original,
        )
    if raw_unit:
        canonical_unit = raw_unit
        if raw_unit in {"metre", "metres", "meter", "meters"}:
            canonical_unit = "metres"
        elif raw_unit in {"gram", "grams"}:
            canonical_unit = "g"
        elif raw_unit in {"kilogram", "kilograms"}:
            canonical_unit = "kg"
        elif raw_unit in {"c", "celsius", "°c"}:
            canonical_unit = "°c"
        elif raw_unit in {"f", "fahrenheit", "°f"}:
            canonical_unit = "°f"
        return NormalizedQuantity(
            value=value,
            unit=canonical_unit,
            dimension="quantity",
            raw_value=value,
            raw_unit=raw_unit,
            qualifier=qualifier,
            original=original,
        )
    return NormalizedQuantity(
        value=value,
        unit=None,
        dimension="number",
        raw_value=value,
        raw_unit=None,
        qualifier=qualifier,
        original=original,
    )


def normalize_money(value: Any, *, currency: str = "INR") -> NormalizedQuantity | None:
    """Normalise INR spellings and lakh/crore scales to INR."""

    if isinstance(value, NormalizedQuantity):
        return value if value.dimension == "money" else None
    text = str(value or "")
    match = _PRICE_RE.search(text) or _SUFFIX_PRICE_RE.search(text)
    if match:
        number = match.group("number")
        scale = match.groupdict().get("scale")
        prefix = match.groupdict().get("prefix")
        detected_currency = _CURRENCY_ALIASES.get(str(prefix or "").casefold(), currency.upper())
        if prefix is None:
            suffix = match.group(0).casefold().strip().split()[-1]
            detected_currency = _CURRENCY_ALIASES.get(suffix, currency.upper())
        return _quantity_from_parts(number, None, original=match.group(0), currency=detected_currency, scale=scale)
    # A structured record may provide a bare number plus a money unit.
    raw = _decimal(value)
    if raw is not None:
        return _quantity_from_parts(raw, None, original=text, currency=currency)
    return None


def normalize_quantity(value: Any, unit: str | None = None, *, qualifier: str | None = None) -> NormalizedQuantity | None:
    """Normalise a number, percentage, price, or supported unit expression."""

    if isinstance(value, NormalizedQuantity):
        return value
    if isinstance(value, dict):
        supplied_unit = value.get("unit") or value.get("units") or unit
        supplied_value = value.get("value", value.get("amount", value.get("number")))
        supplied_qualifier = value.get("qualifier", qualifier)
        supplied_currency = value.get("currency")
        if supplied_value is not None:
            if supplied_currency:
                return _quantity_from_parts(
                    supplied_value,
                    str(supplied_unit) if supplied_unit is not None else None,
                    currency=_CURRENCY_ALIASES.get(str(supplied_currency).casefold(), str(supplied_currency).upper()),
                    qualifier=supplied_qualifier,
                )
            if str(supplied_unit or "").casefold() in {*_CURRENCY_ALIASES, "money"}:
                return normalize_money(supplied_value, currency=_CURRENCY_ALIASES.get(str(supplied_unit).casefold(), "INR"))
            return normalize_quantity(supplied_value, str(supplied_unit) if supplied_unit is not None else None, qualifier=supplied_qualifier)
        text = value.get("text") or value.get("raw") or value.get("label")
        if text is not None:
            return normalize_quantity(text, unit=unit, qualifier=qualifier)
    if isinstance(value, (int, float, Decimal)):
        if unit and unit.casefold() in {*_CURRENCY_ALIASES, "money"}:
            return normalize_money(value, currency=_CURRENCY_ALIASES.get(unit.casefold(), "INR"))
        return _quantity_from_parts(value, unit, original=str(value), qualifier=qualifier)

    text = str(value) if value is not None else ""
    if not text.strip():
        return None
    price = normalize_money(text)
    if price is not None and (_PRICE_RE.search(text) or _SUFFIX_PRICE_RE.search(text)):
        return price
    percent_match = _PERCENT_RE.search(text)
    if percent_match:
        groups = percent_match.groupdict()
        return _quantity_from_parts(
            groups["number"],
            "%",
            original=percent_match.group(0),
            qualifier=qualifier,
        )
    unit_match = _NUMBER_UNIT_RE.search(text)
    if unit_match:
        groups = unit_match.groupdict()
        found_qualifier = groups.get("qualifier")
        return _quantity_from_parts(
            groups["number"],
            groups.get("unit"),
            original=unit_match.group(0),
            qualifier=(found_qualifier.strip() if found_qualifier else qualifier),
        )
    number_match = _BARE_NUMBER_RE.search(text)
    if number_match:
        groups = number_match.groupdict()
        found_qualifier = groups.get("qualifier")
        return _quantity_from_parts(
            groups["number"],
            unit,
            original=number_match.group(0),
            qualifier=(found_qualifier.strip() if found_qualifier else qualifier),
        )
    return None


MONTH_PATTERN = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
    r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)
DAY_PATTERN = r"\d{1,2}(?:st|nd|rd|th)?"
DATE_PATTERN = (
    rf"(?:\d{{4}}[-/]\d{{1,2}}[-/]\d{{1,2}}|\d{{1,2}}[-/]\d{{1,2}}[-/]\d{{2,4}}|"
    rf"{DAY_PATTERN}\s+{MONTH_PATTERN}(?:,?\s+\d{{4}})?|"
    rf"{MONTH_PATTERN}\s+{DAY_PATTERN}(?:,?\s+\d{{4}})?|today|tomorrow|yesterday)"
)
DATE_RANGE_PATTERN = (
    rf"(?:{DATE_PATTERN}\s*(?:to|through|until|[–—]|\s-\s)\s*{DATE_PATTERN}|"
    rf"{DAY_PATTERN}\s*(?:to|through|[-–—])\s*{DAY_PATTERN}\s+{MONTH_PATTERN}(?:\s+\d{{4}})?|"
    rf"{MONTH_PATTERN}\s+{DAY_PATTERN}\s*(?:to|through|[-–—])\s*{DAY_PATTERN}(?:,?\s+\d{{4}})?)"
)


def parse_date_range(value: str, *, today: date | None = None) -> DateRange | None:
    """Parse date ranges, including shared month/year forms, without guessing order."""

    text = re.sub(r"(?<=\d)(st|nd|rd|th)\b", "", str(value or "").strip(), flags=re.IGNORECASE)
    if not text:
        return None
    reference = today or date.today()
    compact = re.fullmatch(
        rf"(?P<left>\d{{1,2}})\s*(?:to|through|[-–—])\s*(?P<right>\d{{1,2}})\s+"
        rf"(?P<month>{MONTH_PATTERN})(?:\s+(?P<year>\d{{4}}))?",
        text,
        re.IGNORECASE,
    )
    if not compact:
        compact = re.fullmatch(
            rf"(?P<month>{MONTH_PATTERN})\s+(?P<left>\d{{1,2}})\s*(?:to|through|[-–—])\s*"
            r"(?P<right>\d{1,2})(?:,?\s+(?P<year>\d{4}))?",
            text,
            re.IGNORECASE,
        )
    if compact:
        month = compact.group("month")
        year = compact.group("year") or str(reference.year)
        left = normalize_date(f"{compact.group('left')} {month} {year}", today=reference)
        right = normalize_date(f"{compact.group('right')} {month} {year}", today=reference)
    else:
        match = re.fullmatch(
            rf"(?P<left>{DATE_PATTERN})\s*(?:to|through|until|[–—]|\s-\s)\s*(?P<right>{DATE_PATTERN})",
            text,
            re.IGNORECASE,
        )
        if not match:
            return None
        left_text, right_text = match.group("left"), match.group("right")
        # A single explicit year applies to both ends of a named date range.
        shared_year = re.search(r"\b(\d{4})\b", right_text)
        if shared_year and re.search(MONTH_PATTERN, left_text, re.IGNORECASE) and not re.search(r"\b\d{4}\b", left_text):
            left_text = f"{left_text} {shared_year.group(1)}"
        left = normalize_date(left_text, today=reference)
        right = normalize_date(right_text, today=reference)
    if left is None or right is None or right < left:
        return None
    return DateRange(start=left, end=right, original=str(value))


_DATE_PATTERNS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%B %d, %Y",
    "%b %d, %Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d %Y",
    "%b %d %Y",
)
_DATE_TOKEN_RE = re.compile(rf"\b{DATE_PATTERN}\b", re.IGNORECASE)


def normalize_date(value: Any, *, today: date | None = None, date_order: str | None = None) -> date | None:
    """Normalise common absolute/relative dates using an injectable reference day."""

    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value or "").strip()
    if not text:
        return None
    reference = today or date.today()
    lowered = text.casefold()
    if lowered == "today":
        return reference
    if lowered == "tomorrow":
        return reference + timedelta(days=1)
    if lowered == "yesterday":
        return reference - timedelta(days=1)

    cleaned = re.sub(r"(?<=\d)(st|nd|rd|th)\b", "", text, flags=re.IGNORECASE)
    # Ambiguous numeric dates are not interpreted via a locale-dependent guess.
    numeric = re.fullmatch(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", cleaned)
    if numeric:
        first, second, year = (int(part) for part in numeric.groups())
        if date_order not in {None, "DMY", "MDY"}:
            raise ValueError("date_order must be DMY, MDY, or None")
        if date_order is None and first <= 12 and second <= 12 and first != second:
            return None
        day_first = date_order == "DMY" or (date_order is None and first > 12)
        month, day = (second, first) if day_first else (first, second)
        try:
            return date(year, month, day)
        except ValueError:
            return None
    for pattern in _DATE_PATTERNS:
        try:
            return datetime.strptime(cleaned, pattern).date()
        except ValueError:
            continue
    if re.fullmatch(rf"(?:{DAY_PATTERN}\s+{MONTH_PATTERN}|{MONTH_PATTERN}\s+{DAY_PATTERN})", cleaned, re.IGNORECASE):
        for pattern in ("%d %B %Y", "%d %b %Y", "%B %d %Y", "%b %d %Y"):
            try:
                return datetime.strptime(f"{cleaned} {reference.year}", pattern).date()
            except ValueError:
                continue
    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).date()
    except ValueError:
        pass
    # Optional dateparser handles explicit relative phrases only.  It must not
    # silently turn an invalid absolute date or an incomplete month into a fact.
    if _dateparser is not None and re.fullmatch(r"(?:in\s+\d+\s+days?|\d+\s+days?\s+ago|next\s+week|last\s+week)", cleaned, re.IGNORECASE):
        try:
            parsed = _dateparser.parse(
                cleaned,
                settings={
                    "RELATIVE_BASE": datetime.combine(reference, datetime.min.time()),
                    "RETURN_AS_TIMEZONE_AWARE": False,
                    "STRICT_PARSING": True,
                },
            )
            if parsed is not None:
                return parsed.date()
        except (TypeError, ValueError, OverflowError):
            pass
    return None


def find_date_spans(text: str, *, today: date | None = None) -> list[tuple[int, int, date]]:
    """Return exact source offsets for dates recognised by the fallback parser."""

    matches: list[tuple[int, int, date]] = []
    for match in _DATE_TOKEN_RE.finditer(text):
        parsed = normalize_date(match.group(0), today=today)
        if parsed is not None:
            matches.append((match.start(), match.end(), parsed))
    return matches


def quantity_from_text(text: str) -> NormalizedQuantity | None:
    """Alias kept for callers that prefer an explicit parsing name."""

    return normalize_quantity(text)
