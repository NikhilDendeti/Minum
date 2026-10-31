// Real values captured from the running demo (seeded synthetic data for Lakshmi Kirana, DEMO_TODAY 2026-11-12).
// The landing page animates these; it never invents a figure. Regenerate by re-capturing if the seed changes.
export const DEMO = {
  "date": "2026-11-12",
  "kpis": {
    "yesterday": 8200,
    "baseline": 9320,
    "delta_pct": -12,
    "slow_window": "18:00-21:00",
    "repeat_share_pct": 57,
    "lapsed_regulars": 40
  },
  "briefing": {
    "en-IN": "Yesterday you earned Rs 8,200, 12% lower than usual for a Wednesday. The slowest hours are evenings 6-9 pm, and 40 regular customers haven't visited in two weeks. Your 9 Nov settlement was Rs 1,420 short. Ask me why.",
    "hi-IN": "कल आपने 8,200 रुपये कमाए, जो एक सामान्य बुधवार से 12 प्रतिशत कम है। शाम 6 से 9 बजे का समय सबसे धीमा रहता है, और 40 नियमित ग्राहक दो हफ़्ते से नहीं आए। आपका 9 नवंबर का सेटलमेंट 1,420 रुपये कम आया। मुझसे पूछिए क्यों।",
    "te-IN": "నిన్న మీరు 8,200 రూపాయలు సంపాదించారు, ఇది సాధారణ బుధవారం కంటే 12 శాతం తక్కువ. సాయంత్రం 6 నుండి 9 వరకు సమయం అతి నెమ్మదిగా ఉంటుంది, అలాగే 40 మంది రెగ్యులర్ కస్టమర్లు రెండు వారాలుగా రాలేదు. మీ నవంబర్ 9 సెటిల్‌మెంట్ 1,420 రూపాయలు తక్కువ వచ్చింది. ఎందుకో నన్ను అడగండి."
  },
  "ask": {
    "en-IN": {
      "q": "How much did I earn yesterday?",
      "a": "Yesterday you earned Rs 8,200, 12% lower than usual for a Wednesday. The slowest hours are evenings 6-9 pm, and 40 regular customers haven't visited in two weeks."
    },
    "hi-IN": {
      "q": "कल कितना हुआ?",
      "a": "कल आपने 8,200 रुपये कमाए, जो एक सामान्य बुधवार से 12 प्रतिशत कम है। शाम 6 से 9 बजे का समय सबसे धीमा रहता है, और 40 नियमित ग्राहक दो हफ़्ते से नहीं आए।"
    },
    "te-IN": {
      "q": "నిన్న ఎంత అమ్మకాలు జరిగాయి?",
      "a": "నిన్న మీరు 8,200 రూపాయలు సంపాదించారు, ఇది సాధారణ బుధవారం కంటే 12 శాతం తక్కువ. సాయంత్రం 6 నుండి 9 వరకు సమయం అతి నెమ్మదిగా ఉంటుంది, అలాగే 40 మంది రెగ్యులర్ కస్టమర్లు రెండు వారాలుగా రాలేదు."
    }
  },
  "evidence": {
    "sql": "SELECT ts::date AS day, SUM(amount) AS earned, COUNT(*) AS txns FROM transactions WHERE status = 'success' AND ts::date IN ('2026-11-11', '2026-11-04', '2026-10-28', '2026-10-21', '2026-10-14') GROUP BY 1 ORDER BY 1 DESC",
    "rows": [
      {
        "day": "2026-11-11",
        "earned": 8200,
        "txns": 92
      },
      {
        "day": "2026-11-04",
        "earned": 9100,
        "txns": 95
      },
      {
        "day": "2026-10-28",
        "earned": 9450,
        "txns": 86
      },
      {
        "day": "2026-10-21",
        "earned": 9200,
        "txns": 82
      },
      {
        "day": "2026-10-14",
        "earned": 9530,
        "txns": 85
      }
    ],
    "tool": "kpi_summary"
  },
  "forecast": {
    "asOf": "2026-11-12",
    "days": [
      {
        "date": "2026-11-13",
        "balance": 20323
      },
      {
        "date": "2026-11-14",
        "balance": 22326
      },
      {
        "date": "2026-11-15",
        "balance": 24765
      },
      {
        "date": "2026-11-16",
        "balance": 26593
      },
      {
        "date": "2026-11-17",
        "balance": 28376
      },
      {
        "date": "2026-11-18",
        "balance": 30294
      },
      {
        "date": "2026-11-19",
        "balance": -12800
      },
      {
        "date": "2026-11-20",
        "balance": -10652
      },
      {
        "date": "2026-11-21",
        "balance": -8649
      },
      {
        "date": "2026-11-22",
        "balance": -6210
      },
      {
        "date": "2026-11-23",
        "balance": -7582
      },
      {
        "date": "2026-11-24",
        "balance": -5799
      },
      {
        "date": "2026-11-25",
        "balance": -3881
      },
      {
        "date": "2026-11-26",
        "balance": -1975
      }
    ],
    "gap": {
      "date": "2026-11-19",
      "min": -12800,
      "driver": {
        "label": "Supplier payment - Sri Balaji Traders",
        "amount": 45000,
        "due_on": "2026-11-19"
      }
    },
    "offer": {
      "amount": 30000,
      "tenureDays": 30
    }
  },
  "growth": {
    "count": 40,
    "discountPct": 10,
    "validDays": 7
  },
  "promo": {
    "en-IN": "Dear Valued Customer, we miss you at Lakshmi Kirana! Enjoy a 10% discount on your next visit, valid for 7 days. We look forward to serving you soon!",
    "hi-IN": "Lakshmi Kirana को आपकी याद आ रही है! इस हफ़्ते अगली खरीदारी पर 10% की छूट पाएँ।",
    "te-IN": "Lakshmi Kirana మిమ్మల్ని మిస్ అవుతోంది! ఈ వారం మీ తదుపరి కొనుగోలుపై 10% తగ్గింపు పొందండి."
  }
} as const;

// Real values captured from stock_plan and expansion_plan for Lakshmi Kirana (merchant 1, DEMO_TODAY 2026-11-12).
// Quantities, festival uplift and the spend map are simulated assumptions; the page says so. Re-capture if plan_data changes.
export const PLAN = {
  "stock": {
    "en-IN": {
      "category": "Grocery store",
      "days": [
        {
          "date": "2026-11-13",
          "vs_typical_pct": 7,
          "events": []
        },
        {
          "date": "2026-11-14",
          "vs_typical_pct": 0,
          "events": [
            "Children's Day"
          ]
        },
        {
          "date": "2026-11-15",
          "vs_typical_pct": 21,
          "events": []
        }
      ],
      "items": [
        {
          "sku": "biscuits",
          "name": "Biscuits",
          "unit": "packs",
          "per_day": [
            25,
            30,
            30
          ],
          "total": 85,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "Children's Day"
        },
        {
          "sku": "chocolates",
          "name": "Chocolates",
          "unit": "packs",
          "per_day": [
            10,
            12,
            12
          ],
          "total": 34,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "Children's Day"
        },
        {
          "sku": "rice",
          "name": "Rice",
          "unit": "kg",
          "per_day": [
            14,
            13,
            16
          ],
          "total": 43,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "atta",
          "name": "Wheat flour, atta",
          "unit": "kg",
          "per_day": [
            12,
            11,
            14
          ],
          "total": 37,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "tea",
          "name": "Tea powder",
          "unit": "packs",
          "per_day": [
            8,
            8,
            9
          ],
          "total": 25,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        }
      ]
    },
    "hi-IN": {
      "category": "किराना दुकान",
      "days": [
        {
          "date": "2026-11-13",
          "vs_typical_pct": 7,
          "events": []
        },
        {
          "date": "2026-11-14",
          "vs_typical_pct": 0,
          "events": [
            "बाल दिवस"
          ]
        },
        {
          "date": "2026-11-15",
          "vs_typical_pct": 21,
          "events": []
        }
      ],
      "items": [
        {
          "sku": "biscuits",
          "name": "बिस्कुट",
          "unit": "पैक",
          "per_day": [
            25,
            30,
            30
          ],
          "total": 85,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "बाल दिवस"
        },
        {
          "sku": "chocolates",
          "name": "चॉकलेट",
          "unit": "पैक",
          "per_day": [
            10,
            12,
            12
          ],
          "total": 34,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "बाल दिवस"
        },
        {
          "sku": "rice",
          "name": "चावल",
          "unit": "किलो",
          "per_day": [
            14,
            13,
            16
          ],
          "total": 43,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "atta",
          "name": "आटा",
          "unit": "किलो",
          "per_day": [
            12,
            11,
            14
          ],
          "total": 37,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "tea",
          "name": "चायपत्ती",
          "unit": "पैक",
          "per_day": [
            8,
            8,
            9
          ],
          "total": 25,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        }
      ]
    },
    "te-IN": {
      "category": "కిరాణా దుకాణం",
      "days": [
        {
          "date": "2026-11-13",
          "vs_typical_pct": 7,
          "events": []
        },
        {
          "date": "2026-11-14",
          "vs_typical_pct": 0,
          "events": [
            "బాలల దినోత్సవం"
          ]
        },
        {
          "date": "2026-11-15",
          "vs_typical_pct": 21,
          "events": []
        }
      ],
      "items": [
        {
          "sku": "biscuits",
          "name": "బిస్కెట్లు",
          "unit": "ప్యాక్‌లు",
          "per_day": [
            25,
            30,
            30
          ],
          "total": 85,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "బాలల దినోత్సవం"
        },
        {
          "sku": "chocolates",
          "name": "చాక్లెట్లు",
          "unit": "ప్యాక్‌లు",
          "per_day": [
            10,
            12,
            12
          ],
          "total": 34,
          "boost_day": 1,
          "boost_pct": 30,
          "boost_event": "బాలల దినోత్సవం"
        },
        {
          "sku": "rice",
          "name": "బియ్యం",
          "unit": "కిలో",
          "per_day": [
            14,
            13,
            16
          ],
          "total": 43,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "atta",
          "name": "గోధుమ పిండి",
          "unit": "కిలో",
          "per_day": [
            12,
            11,
            14
          ],
          "total": 37,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        },
        {
          "sku": "tea",
          "name": "టీ పొడి",
          "unit": "ప్యాక్‌లు",
          "per_day": [
            8,
            8,
            9
          ],
          "total": 25,
          "boost_day": null,
          "boost_pct": null,
          "boost_event": null
        }
      ]
    }
  },
  "map": {
    "grid": 7,
    "monthly_sales": 285979,
    "cells": [
      {
        "row": 0,
        "col": 0,
        "score": 132500,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 1,
        "score": 128333,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 2,
        "score": 160000,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 3,
        "score": 151667,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 4,
        "score": 105000,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 5,
        "score": 125000,
        "you": false,
        "rank": 0
      },
      {
        "row": 0,
        "col": 6,
        "score": 225000,
        "you": false,
        "rank": 1
      },
      {
        "row": 1,
        "col": 0,
        "score": 167500,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 1,
        "score": 113750,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 2,
        "score": 151250,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 3,
        "score": 141250,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 4,
        "score": 113333,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 5,
        "score": 150000,
        "you": false,
        "rank": 0
      },
      {
        "row": 1,
        "col": 6,
        "score": 120000,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 0,
        "score": 152500,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 1,
        "score": 126667,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 2,
        "score": 127500,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 3,
        "score": 130000,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 4,
        "score": 126667,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 5,
        "score": 145000,
        "you": false,
        "rank": 0
      },
      {
        "row": 2,
        "col": 6,
        "score": 122500,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 0,
        "score": 135000,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 1,
        "score": 162500,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 2,
        "score": 136667,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 3,
        "score": 148750,
        "you": true,
        "rank": 0
      },
      {
        "row": 3,
        "col": 4,
        "score": 132500,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 5,
        "score": 140000,
        "you": false,
        "rank": 0
      },
      {
        "row": 3,
        "col": 6,
        "score": 155000,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 0,
        "score": 137500,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 1,
        "score": 155000,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 2,
        "score": 133333,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 3,
        "score": 146250,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 4,
        "score": 136000,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 5,
        "score": 120000,
        "you": false,
        "rank": 0
      },
      {
        "row": 4,
        "col": 6,
        "score": 111667,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 0,
        "score": 127500,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 1,
        "score": 142500,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 2,
        "score": 115000,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 3,
        "score": 126250,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 4,
        "score": 118000,
        "you": false,
        "rank": 0
      },
      {
        "row": 5,
        "col": 5,
        "score": 181667,
        "you": false,
        "rank": 3
      },
      {
        "row": 5,
        "col": 6,
        "score": 110000,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 0,
        "score": 112500,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 1,
        "score": 122500,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 2,
        "score": 132500,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 3,
        "score": 108333,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 4,
        "score": 200000,
        "you": false,
        "rank": 2
      },
      {
        "row": 6,
        "col": 5,
        "score": 123333,
        "you": false,
        "rank": 0
      },
      {
        "row": 6,
        "col": 6,
        "score": 145000,
        "you": false,
        "rank": 0
      }
    ],
    "category": {
      "en-IN": "Grocery store",
      "hi-IN": "किराना दुकान",
      "te-IN": "కిరాణా దుకాణం"
    },
    "top": {
      "en-IN": [
        {
          "rank": 1,
          "distance_m": 2100,
          "direction": "north-east",
          "spend": 225000,
          "shops": 0
        },
        {
          "rank": 2,
          "distance_m": 1600,
          "direction": "south",
          "spend": 400000,
          "shops": 1
        },
        {
          "rank": 3,
          "distance_m": 1400,
          "direction": "south-east",
          "spend": 545000,
          "shops": 2
        }
      ],
      "hi-IN": [
        {
          "rank": 1,
          "distance_m": 2100,
          "direction": "उत्तर-पूर्व",
          "spend": 225000,
          "shops": 0
        },
        {
          "rank": 2,
          "distance_m": 1600,
          "direction": "दक्षिण",
          "spend": 400000,
          "shops": 1
        },
        {
          "rank": 3,
          "distance_m": 1400,
          "direction": "दक्षिण-पूर्व",
          "spend": 545000,
          "shops": 2
        }
      ],
      "te-IN": [
        {
          "rank": 1,
          "distance_m": 2100,
          "direction": "ఈశాన్యం",
          "spend": 225000,
          "shops": 0
        },
        {
          "rank": 2,
          "distance_m": 1600,
          "direction": "దక్షిణం",
          "spend": 400000,
          "shops": 1
        },
        {
          "rank": 3,
          "distance_m": 1400,
          "direction": "ఆగ్నేయం",
          "spend": 545000,
          "shops": 2
        }
      ]
    }
  }
};
