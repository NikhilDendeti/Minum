"""Reference data for the planning tools (3-day stock plan, new-branch suggestion).

Everything here is an ASSUMPTION used by a prototype, and the API labels it as simulated:
  * CATALOG: what a typical shop of each type stocks, and a rough daily quantity per Rs 10,000 of daily sales.
  * EVENTS: festival dates for Nov 2026, each cross-checked against several 2026 calendars. Dates that sources disagree
    on (Govardhan Puja) or that could not be confirmed (Karthika Masam start) are left out on purpose.
  * LOCATIONS: the approximate centre of each demo merchant's neighbourhood.
Paytm's own item-level and location data would replace all three. Hindi and Telugu wording needs a native-speaker review.
"""
from datetime import date

LANGS = ("en", "hi", "te")

# category key -> label per language
CATEGORY_LABELS = {
    "grocery": {"en": "Grocery store", "hi": "किराना दुकान", "te": "కిరాణా దుకాణం"},
    "pharmacy": {"en": "Pharmacy", "hi": "दवा की दुकान", "te": "మందుల దుకాణం"},
    "tea": {"en": "Tea and tiffin stall", "hi": "चाय और नाश्ते का स्टॉल", "te": "టీ, టిఫిన్ స్టాల్"},
    "salon": {"en": "Salon", "hi": "सैलून", "te": "సెలూన్"},
    "produce": {"en": "Fruit and vegetable stall", "hi": "फल और सब्ज़ी की दुकान", "te": "పండ్లు, కూరగాయల దుకాణం"},
    "pooja": {"en": "Pooja store", "hi": "पूजा सामग्री की दुकान", "te": "పూజా సామగ్రి దుకాణం"},
}

# the merchant's saved category -> catalog key
CATEGORY_KEYS = {
    "Grocery store": "grocery",
    "Pharmacy": "pharmacy",
    "Tea and tiffin stall": "tea",
    "Salon": "salon",
    "Fruit and vegetable stall": "produce",
    "Pooja store": "pooja",
}

UNIT_LABELS = {
    "kg": {"en": "kg", "hi": "किलो", "te": "కిలో"},
    "l": {"en": "litres", "hi": "लीटर", "te": "లీటర్లు"},
    "pcs": {"en": "pieces", "hi": "नग", "te": "ముక్కలు"},
    "packs": {"en": "packs", "hi": "पैक", "te": "ప్యాక్‌లు"},
    "dozen": {"en": "dozen", "hi": "दर्जन", "te": "డజన్లు"},
    "bunches": {"en": "bunches", "hi": "गुच्छे", "te": "కట్టలు"},
}

# sku: (id, (en, hi, te), unit, units per day per Rs 10,000 of daily sales, tags)
CATALOG = {
    "grocery": [
        ("rice", ("Rice", "चावल", "బియ్యం"), "kg", 14, ("staple",)),
        ("atta", ("Wheat flour, atta", "आटा", "గోధుమ పిండి"), "kg", 12, ("staple", "chhath")),
        ("sugar", ("Sugar", "चीनी", "చక్కెర"), "kg", 6, ("sweet",)),
        ("jaggery", ("Jaggery", "गुड़", "బెల్లం"), "kg", 2, ("sweet", "chhath")),
        ("oil", ("Cooking oil", "खाने का तेल", "వంట నూనె"), "l", 6, ("staple",)),
        ("ghee", ("Ghee", "घी", "నెయ్యి"), "kg", 2, ("sweet", "chhath")),
        ("tea", ("Tea powder", "चायपत्ती", "టీ పొడి"), "packs", 8, ("staple",)),
        ("biscuits", ("Biscuits", "बिस्कुट", "బిస్కెట్లు"), "packs", 25, ("kids",)),
        ("chocolates", ("Chocolates", "चॉकलेट", "చాక్లెట్లు"), "packs", 10, ("kids",)),
    ],
    "pharmacy": [
        ("paracetamol", ("Paracetamol strips", "पैरासिटामोल की पट्टी", "పారాసిటమాల్ స్ట్రిప్స్"), "packs", 20, ()),
        ("cough", ("Cough syrup", "खांसी की दवा", "దగ్గు మందు"), "pcs", 8, ()),
        ("ors", ("ORS packets", "ओआरएस पैकेट", "ఓఆర్ఎస్ ప్యాకెట్లు"), "packs", 12, ()),
        ("vitc", ("Vitamin C tablets", "विटामिन सी की गोलियां", "విటమిన్ సి మాత్రలు"), "packs", 6, ()),
        ("bandage", ("Bandages and cotton", "पट्टी और रूई", "కట్టు గుడ్డ, దూది"), "packs", 8, ()),
        ("sanitiser", ("Hand sanitiser", "सैनिटाइज़र", "శానిటైజర్"), "pcs", 6, ()),
    ],
    "tea": [
        ("milk", ("Milk", "दूध", "పాలు"), "l", 40, ()),
        ("tea", ("Tea powder", "चायपत्ती", "టీ పొడి"), "kg", 2, ()),
        ("sugar", ("Sugar", "चीनी", "చక్కెర"), "kg", 5, ()),
        ("idli", ("Idli batter", "इडली का घोल", "ఇడ్లీ పిండి"), "kg", 18, ()),
        ("dosa", ("Dosa batter", "डोसा का घोल", "దోశ పిండి"), "kg", 14, ()),
        ("coconut", ("Coconut", "नारियल", "కొబ్బరికాయ"), "pcs", 12, ()),
        ("biscuits", ("Biscuits", "बिस्कुट", "బిస్కెట్లు"), "packs", 15, ("kids",)),
    ],
    "salon": [
        ("colour", ("Hair colour", "हेयर कलर", "హెయిర్ కలర్"), "pcs", 4, ()),
        ("facial", ("Facial kits", "फेशियल किट", "ఫేషియల్ కిట్లు"), "pcs", 5, ()),
        ("wax", ("Wax", "वैक्स", "వ్యాక్స్"), "packs", 3, ()),
        ("shampoo", ("Shampoo sachets", "शैंपू के पाउच", "షాంపూ సాచెట్లు"), "pcs", 20, ()),
        ("towels", ("Disposable towels", "डिस्पोज़ेबल तौलिए", "డిస్పోజబుల్ టవల్స్"), "packs", 6, ()),
    ],
    "produce": [
        ("tomato", ("Tomato", "टमाटर", "టమాటా"), "kg", 40, ()),
        ("onion", ("Onion", "प्याज", "ఉల్లిపాయ"), "kg", 45, ()),
        ("potato", ("Potato", "आलू", "బంగాళదుంప"), "kg", 40, ()),
        ("greens", ("Leafy greens", "पत्तेदार सब्ज़ियाँ", "ఆకుకూరలు"), "bunches", 30, ()),
        ("banana", ("Banana", "केला", "అరటిపండ్లు"), "dozen", 8, ("chhath", "puja")),
        ("apple", ("Apple", "सेब", "ఆపిల్"), "kg", 10, ("chhath",)),
        ("sweetpotato", ("Sweet potato", "शकरकंद", "చిలగడదుంప"), "kg", 5, ("chhath",)),
        ("sugarcane", ("Sugarcane", "गन्ना", "చెరకు"), "pcs", 6, ("chhath",)),
        ("coconut", ("Coconut", "नारियल", "కొబ్బరికాయ"), "pcs", 10, ("chhath", "puja")),
    ],
    "pooja": [
        ("incense", ("Incense sticks", "अगरबत्ती", "అగరబత్తులు"), "packs", 25, ("puja",)),
        ("camphor", ("Camphor", "कपूर", "కర్పూరం"), "packs", 15, ("puja",)),
        ("wicks", ("Cotton wicks", "रुई की बाती", "దూది వత్తులు"), "packs", 20, ("puja", "lamp")),
        ("lampoil", ("Lamp oil", "दीपक का तेल", "దీపం నూనె"), "l", 4, ("puja", "lamp")),
        ("diyas", ("Clay lamps, diyas", "मिट्टी के दीये", "ప్రమిదలు"), "dozen", 12, ("puja", "lamp")),
        ("kumkum", ("Kumkum and turmeric", "कुमकुम और हल्दी", "కుంకుమ, పసుపు"), "packs", 18, ("puja",)),
        ("coconut", ("Coconut", "नारियल", "కొబ్బరికాయ"), "pcs", 20, ("puja", "chhath")),
        ("garlands", ("Flower garlands", "फूलों की माला", "పూల మాలలు"), "pcs", 25, ("puja",)),
    ],
}

# Festival and events calendar, Nov 2026. `boosts` maps an item tag to a demand multiplier (an assumption).
# `regions` are matched against the merchant's city text; None means everywhere.
EVENTS = [
    {"id": "chhath", "start": date(2026, 11, 13), "end": date(2026, 11, 16), "regions": ("Delhi", "Mumbai"),
     "names": {"en": "Chhath Puja", "hi": "छठ पूजा", "te": "ఛఠ్ పూజ"},
     "boosts": {"chhath": 1.5, "puja": 1.25}},
    {"id": "childrens_day", "start": date(2026, 11, 14), "end": date(2026, 11, 14), "regions": None,
     "names": {"en": "Children's Day", "hi": "बाल दिवस", "te": "బాలల దినోత్సవం"},
     "boosts": {"kids": 1.3}},
    {"id": "dev_deepavali", "start": date(2026, 11, 24), "end": date(2026, 11, 24), "regions": None,
     "names": {"en": "Dev Deepavali", "hi": "देव दीपावली", "te": "దేవ దీపావళి"},
     "boosts": {"lamp": 2.0, "puja": 1.4}},
    {"id": "guru_nanak", "start": date(2026, 11, 24), "end": date(2026, 11, 24), "regions": None,
     "names": {"en": "Guru Nanak Jayanti", "hi": "गुरु नानक जयंती", "te": "గురునానక్ జయంతి"},
     "boosts": {"sweet": 1.2}},
]
CALENDAR_NOTE = {
    "en": "Festival dates are checked against several 2026 calendars. Confirm with your local panchang.",
    "hi": "त्योहारों की तारीख़ें 2026 के कई कैलेंडरों से मिलाई गई हैं। अपने स्थानीय पंचांग से पुष्टि करें।",
    "te": "పండుగ తేదీలను 2026 లోని పలు క్యాలెండర్లతో సరిచూశాం. మీ స్థానిక పంచాంగంతో నిర్ధారించుకోండి.",
}

DIRECTIONS = [
    {"en": "north", "hi": "उत्तर", "te": "ఉత్తరం"},
    {"en": "north-east", "hi": "उत्तर-पूर्व", "te": "ఈశాన్యం"},
    {"en": "east", "hi": "पूर्व", "te": "తూర్పు"},
    {"en": "south-east", "hi": "दक्षिण-पूर्व", "te": "ఆగ్నేయం"},
    {"en": "south", "hi": "दक्षिण", "te": "దక్షిణం"},
    {"en": "south-west", "hi": "दक्षिण-पश्चिम", "te": "నైరుతి"},
    {"en": "west", "hi": "पश्चिम", "te": "పశ్చిమం"},
    {"en": "north-west", "hi": "उत्तर-पश्चिम", "te": "వాయవ్యం"},
]

# merchant id -> approximate (latitude, longitude) of the neighbourhood; the map is simulated around it
LOCATIONS = {
    1: (17.4849, 78.4138),  # Kukatpally, Hyderabad
    2: (28.6519, 77.1909),  # Karol Bagh, Delhi
    3: (19.1364, 72.8296),  # Andheri West, Mumbai
    4: (17.4399, 78.4983),  # Secunderabad
    5: (12.9719, 77.6412),  # Indiranagar, Bengaluru
    6: (17.3950, 78.4400),  # Mehdipatnam, Hyderabad
}


# --- new-branch economics: EVERY value below is an assumption for the demo, shown to the merchant under "How we estimate this" ---
NEW_SHOP_FACTOR = 0.6  # a new shop does not win a full share of an area's spend on day one
# Share of sales left after stock and running costs, before rent. Assumed per shop type. The first draft used 0.10, 0.15,
# 0.25 and 0.40 (grocery, pharmacy, tea, salon); at those values every grocery area lost money after rent, so they were raised.
MARGIN = {"grocery": 0.22, "pharmacy": 0.20, "tea": 0.35, "salon": 0.40, "produce": 0.18, "pooja": 0.20}
DEFAULT_RENT = 15000  # Rs a month, used only when a merchant has no "Shop rent" obligation
DEPOSIT_MONTHS = 3  # months of rent paid up front as a deposit
OPENING_STOCK_DAYS = 10  # days of expected sales held as opening stock
FITOUT = 100000  # Rs for shelves, signage and electrics
SALES_ROUND = 500  # displayed sales and profit are rounded to this
SETUP_ROUND = 5000  # displayed setup cost is rounded to this
MAX_PAYBACK_MONTHS = 18  # an area at or under this offers the "Request expansion credit" action

