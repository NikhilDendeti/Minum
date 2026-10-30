"""Prepare text for TTS. Hindi numbers become Devanagari words ("aath hazaar do sau"); English amounts become words in the
Indian system ("two lakh ninety-two thousand"); Telugu keeps digits (commas removed) and relies on the speech provider's
number normalisation (Telugu number words are irregular enough that a mistake would be spoken in the demo)."""
import re

_HI = ("शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस "
       "इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस "
       "इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास "
       "इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ "
       "इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर "
       "इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी "
       "इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे "
       "इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे").split()
assert len(_HI) == 100

_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def hindi_words(n):
    n = int(n)
    if n < 100:
        return _HI[n]
    parts = []
    for size, name in ((10_000_000, "करोड़"), (100_000, "लाख"), (1000, "हज़ार"), (100, "सौ")):
        q, n = divmod(n, size)
        if q:
            parts.append(f"{hindi_words(q)} {name}")
    if n:
        parts.append(_HI[n])
    return " ".join(parts)


def _hindi(match):
    raw = match.group(0).replace(",", "")
    whole, _, frac = raw.partition(".")
    out = hindi_words(whole)
    if frac:
        out += " दशमलव " + " ".join(_HI[int(c)] for c in frac)
    return out


_EN_ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen "
            "eighteen nineteen").split()
_EN_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
_RUPEES = re.compile(r"(?:Rs\.?|₹)\s?(\d[\d,]*)(?![\d,]|\.\d)")
_BIG = re.compile(r"(?<![\w.,])(?:\d{1,3}(?:,\d{2,3})+|\d{4,})(?![\w,]|\.\d)")


def english_words(n):
    """Indian system: 292675 -> 'two lakh ninety-two thousand six hundred seventy-five'."""
    n = int(n)
    if n < 20:
        return _EN_ONES[n]
    if n < 100:
        return _EN_TENS[n // 10] + (f"-{_EN_ONES[n % 10]}" if n % 10 else "")
    parts = []
    for size, name in ((10_000_000, "crore"), (100_000, "lakh"), (1000, "thousand"), (100, "hundred")):
        q, n = divmod(n, size)
        if q:
            parts.append(f"{english_words(q)} {name}")
    if n:
        parts.append(english_words(n))
    return " ".join(parts)


def _english(text):
    text = _RUPEES.sub(lambda m: f"{english_words(m.group(1).replace(',', ''))} rupees", text)

    def big(m):
        digits = m.group(0).replace(",", "")
        return m.group(0) if "," not in m.group(0) and len(digits) == 4 and 1900 <= int(digits) <= 2100 else english_words(digits)  # a year

    return _BIG.sub(big, text).replace("%", " percent")


def speak_numbers(text, lang):
    if lang.startswith("en"):
        return _english(text)
    if lang == "hi-IN":
        return _NUMBER.sub(_hindi, text).replace("%", " प्रतिशत")
    if lang == "te-IN":
        return _NUMBER.sub(lambda m: m.group(0).replace(",", ""), text).replace("%", " శాతం")
    return text
