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
