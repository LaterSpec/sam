"""Ticker universe shared by the live-data and Yahoo sync jobs.

ASSET_ID_TO_SYMBOL mirrors cuantito's ACTIVOS_DB (asset_id -> IBKR symbol). The
Newroad live-prices SSE stream keys everything by asset_id, so we need this map
to translate incoming ticks back into the symbols stored in public.market_symbols.
Keep this in sync with the seed in 20260529100004_market_schema.sql.
"""

# asset_id -> symbol  (cuantitov8.ACTIVOS_DB)
ASSET_ID_TO_SYMBOL = {
    354: "MSFT", 100: "ORCL", 182: "ADBE", 607: "APLD", 1249: "MRVL",
    366: "NVDA", 95: "NOW", 52: "ACN", 183: "AI", 555: "AMD",
    101: "QCOM", 876: "EPAM", 2098: "PANW", 123: "VRNS", 588: "ASML",
    606: "AVGO", 289: "META", 174: "AAPL", 420: "SAP", 1986: "ZBRA",
    2142: "IGV", 361: "NKE", 38: "STLA", 327: "JD", 1195: "LULU",
    1144: "LCID", 192: "AMZN", 875: "DKNG", 360: "NFLX", 1517: "RACE",
    1984: "TSLA", 200: "BABA", 253: "DEO", 359: "NIO", 265: "DPZ",
    303: "HOG", 802: "CPNG", 1168: "MELI", 58: "HRL", 394: "PYPL",
    403: "QIWI", 1987: "WDI", 1964: "V", 2030: "BX", 931: "FOUR",
    302: "IBIT", 554: "AMT", 1038: "HUN", 76: "VST", 371: "NU",
    1351: "NVO", 40: "UNH", 610: "AUNA", 1570: "SNY", 412: "RYLD",
    202: "BCAT", 39: "TLTW", 37: "FAX", 408: "QYLD", 264: "ECAT",
    1985: "TLT", 293: "GBAB", 230: "BWG", 874: "DSU", 31: "BHK",
    33: "GHY", 43: "BKT", 769: "BINC", 1889: "USIG", 376: "PCEF",
    63: "IGLB", 333: "KBWD", 41: "LQDW", 64: "BMEZ", 42: "AVK",
    609: "AGGH", 770: "BTZ", 134: "XYLD", 413: "SHV", 425: "SPY",
    294: "GDO", 61: "SPHY", 877: "DMO", 263: "EAD", 406: "QQQ",
}

SYMBOL_TO_ASSET_ID = {sym: aid for aid, sym in ASSET_ID_TO_SYMBOL.items()}

# Default watchlist mirrored from market_symbols.curated (kept for reference /
# offline tooling; the DB is the source of truth at runtime).
CURATED = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA",
    "AVGO", "AMD", "NFLX", "V", "SPY", "QQQ",
]

ALL_SYMBOLS = sorted(ASSET_ID_TO_SYMBOL.values())
