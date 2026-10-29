"""Prepare text for TTS. Hindi numbers become Devanagari words ("aath hazaar do sau"); Telugu keeps digits
(commas removed) and relies on the speech provider's number normalisation."""
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


def speak_numbers(text, lang):
    if lang == "hi-IN":
        return _NUMBER.sub(_hindi, text).replace("%", " प्रतिशत")
    if lang == "te-IN":
        return _NUMBER.sub(lambda m: m.group(0).replace(",", ""), text).replace("%", " శాతం")
    return text
