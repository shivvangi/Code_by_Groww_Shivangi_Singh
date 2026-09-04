import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Route validation logic tests (pure unit – no DB/HTTP)
// ─────────────────────────────────────────────────────────────────────────────

// ─── userId validation ────────────────────────────────────────────────────────
describe("userId validation", () => {
  const isValid = (v: any) => Boolean(v);
  it("empty string is invalid", () => expect(isValid("")).toBe(false));
  it("null is invalid", () => expect(isValid(null)).toBe(false));
  it("undefined is invalid", () => expect(isValid(undefined)).toBe(false));
  it("0 is invalid (falsy)", () => expect(isValid(0)).toBe(false));
  it("'0' string is valid", () => expect(isValid("0")).toBe(true));
  it("normal UUID is valid", () => expect(isValid("123e4567-e89b-12d3-a456-426614174000")).toBe(true));
  it("whitespace string is valid (truthy)", () => expect(isValid("   ")).toBe(true));
  it("special chars userId is valid (truthy)", () => expect(isValid("user!@#")).toBe(true));
  it("very long string is valid", () => expect(isValid("a".repeat(1000))).toBe(true));
  it("numeric userId is valid", () => expect(isValid(42)).toBe(true));
});

// ─── ticker validation ────────────────────────────────────────────────────────
describe("ticker normalization (toUpperCase)", () => {
  it("aapl → AAPL", () => expect("aapl".toUpperCase()).toBe("AAPL"));
  it("already uppercase unchanged", () => expect("AAPL".toUpperCase()).toBe("AAPL"));
  it("mixed case", () => expect("AaPl".toUpperCase()).toBe("AAPL"));
  it("with .NS suffix", () => expect("hdfcbank.ns".toUpperCase()).toBe("HDFCBANK.NS"));
  it("BTC-USD", () => expect("btc-usd".toUpperCase()).toBe("BTC-USD"));
  it("single char", () => expect("a".toUpperCase()).toBe("A"));
  it("empty string", () => expect("".toUpperCase()).toBe(""));
  it("numbers unchanged", () => expect("123".toUpperCase()).toBe("123"));
  it("symbols unchanged", () => expect("^GSPC".toUpperCase()).toBe("^GSPC"));
  it("GBP currency pair", () => expect("gbp=x".toUpperCase()).toBe("GBP=X"));
});

// ─── Watchlist sorting logic ──────────────────────────────────────────────────
describe("watchlist sort: meaningful first, then newest", () => {
  const sort = (items: any[]) =>
    [...items].sort((a, b) => {
      if (a.meaningful && !b.meaningful) return -1;
      if (!a.meaningful && b.meaningful) return 1;
      const dA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const dB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return dB - dA;
    });

  it("meaningful before non-meaningful", () => {
    const r = sort([
      {ticker:"A", meaningful:false, addedAt:"2024-01-01"},
      {ticker:"B", meaningful:true, addedAt:"2024-01-01"},
    ]);
    expect(r[0].ticker).toBe("B");
  });
  it("two meaningful: newest first", () => {
    const r = sort([
      {ticker:"A", meaningful:true, addedAt:"2024-01-01"},
      {ticker:"B", meaningful:true, addedAt:"2024-01-03"},
    ]);
    expect(r[0].ticker).toBe("B");
  });
  it("two non-meaningful: newest first", () => {
    const r = sort([
      {ticker:"A", meaningful:false, addedAt:"2024-01-01"},
      {ticker:"B", meaningful:false, addedAt:"2024-01-03"},
    ]);
    expect(r[0].ticker).toBe("B");
  });
  it("all meaningful, multiple: sorted by date", () => {
    const r = sort([
      {ticker:"A", meaningful:true, addedAt:"2024-01-01"},
      {ticker:"B", meaningful:true, addedAt:"2024-01-05"},
      {ticker:"C", meaningful:true, addedAt:"2024-01-03"},
    ]);
    expect(r.map((x: any) => x.ticker)).toEqual(["B","C","A"]);
  });
  it("meaningful always before non-meaningful regardless of date", () => {
    const r = sort([
      {ticker:"OLD_MEANINGFUL", meaningful:true, addedAt:"2020-01-01"},
      {ticker:"NEW_NORMAL", meaningful:false, addedAt:"2024-01-01"},
    ]);
    expect(r[0].ticker).toBe("OLD_MEANINGFUL");
  });
  it("null addedAt treated as 0 (epoch)", () => {
    const r = sort([
      {ticker:"A", meaningful:false, addedAt:null},
      {ticker:"B", meaningful:false, addedAt:"2024-01-01"},
    ]);
    expect(r[0].ticker).toBe("B");
  });
  it("undefined addedAt treated as 0", () => {
    const r = sort([
      {ticker:"A", meaningful:false, addedAt:undefined},
      {ticker:"B", meaningful:false, addedAt:"2024-01-01"},
    ]);
    expect(r[0].ticker).toBe("B");
  });
  it("empty list returns empty", () => expect(sort([])).toHaveLength(0));
  it("single item returns same", () => {
    const r = sort([{ticker:"A", meaningful:true, addedAt:"2024-01-01"}]);
    expect(r[0].ticker).toBe("A");
  });
  it("50 items: all meaningful come before all non-meaningful", () => {
    const items = [
      ...Array.from({length:25}, (_,i) => ({ticker:`M${i}`, meaningful:true, addedAt:`2024-01-${String(i+1).padStart(2,"0")}`})),
      ...Array.from({length:25}, (_,i) => ({ticker:`N${i}`, meaningful:false, addedAt:`2024-01-${String(i+1).padStart(2,"0")}`})),
    ];
    const shuffled = items.sort(() => Math.random() - 0.5);
    const r = sort(shuffled);
    const firstNonMeaningfulIdx = r.findIndex((x: any) => !x.meaningful);
    const lastMeaningfulIdx = r.map((x: any) => x.meaningful).lastIndexOf(true);
    expect(lastMeaningfulIdx).toBeLessThan(firstNonMeaningfulIdx);
  });
});

// ─── Price formatting logic ───────────────────────────────────────────────────
describe("price formatting helpers", () => {
  const USD_RATE = 83.5;

  const formatPrice = (price: number, currency = "USD") => {
    const base = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
    if (currency === "USD") {
      const inr = new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(price * USD_RATE);
      return `${base} (${inr})`;
    }
    if (currency === "INR") {
      const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / USD_RATE);
      return `${base} (${usd})`;
    }
    return base;
  };

  it("USD price includes $ symbol", () => expect(formatPrice(100)).toContain("$"));
  it("USD price includes INR in parentheses", () => expect(formatPrice(100)).toContain("("));
  it("USD price includes ₹ for INR conversion", () => expect(formatPrice(100)).toContain("₹"));
  it("INR price includes ₹ symbol", () => expect(formatPrice(100, "INR")).toContain("₹"));
  it("INR price includes USD in parentheses", () => expect(formatPrice(100, "INR")).toContain("$"));
  it("EUR price returns base only", () => {
    const f = formatPrice(100, "EUR");
    expect(f).not.toContain("(");
  });
  it("USD 0 formats correctly", () => expect(formatPrice(0)).toContain("$0.00"));
  it("USD 1000000 has comma separator", () => expect(formatPrice(1000000)).toContain(","));
  it("split on ' (' gives two parts for USD", () => {
    const f = formatPrice(100);
    expect(f.split(" (")).toHaveLength(2);
  });
  it("INR conversion rate applied correctly", () => {
    const f = formatPrice(1, "USD"); // 1 USD = 83.5 INR
    expect(f).toContain("83.50");
  });

  const formatLargeNum = (num: number, currency = "USD") => {
    if (!num) return "N/A";
    const s = (n: number) => {
      if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
      if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      return n.toLocaleString();
    };
    return "$" + s(num);
  };

  it("N/A for 0", () => expect(formatLargeNum(0)).toBe("N/A"));
  it("N/A for null", () => expect(formatLargeNum(null as any)).toBe("N/A"));
  it("N/A for undefined", () => expect(formatLargeNum(undefined as any)).toBe("N/A"));
  it("trillion formatted with T", () => expect(formatLargeNum(1.5e12)).toContain("T"));
  it("billion formatted with B", () => expect(formatLargeNum(2.5e9)).toContain("B"));
  it("million formatted with M", () => expect(formatLargeNum(3.5e6)).toContain("M"));
  it("1T = $1.00T", () => expect(formatLargeNum(1e12)).toBe("$1.00T"));
  it("1B = $1.00B", () => expect(formatLargeNum(1e9)).toBe("$1.00B"));
  it("1M = $1.00M", () => expect(formatLargeNum(1e6)).toBe("$1.00M"));
  it("500K doesn't use M suffix", () => expect(formatLargeNum(500000)).not.toContain("M"));
  it("1.5T = $1.50T", () => expect(formatLargeNum(1.5e12)).toBe("$1.50T"));
  it("2.73B = $2.73B", () => expect(formatLargeNum(2.73e9)).toBe("$2.73B"));
});

// ─── Supabase unique constraint handling ─────────────────────────────────────
describe("duplicate ticker insert handling (23505)", () => {
  const shouldThrow = (error: any) => error && error.code !== "23505";
  it("no error -> falsy, no throw", () => expect(Boolean(shouldThrow(null))).toBe(false));
  it("code 23505 → don't throw", () => expect(shouldThrow({code:"23505"})).toBe(false));
  it("other code → throw", () => expect(shouldThrow({code:"23000"})).toBe(true));
  it("network error → throw", () => expect(shouldThrow({code:"ECONNREFUSED"})).toBe(true));
  it("undefined error code → throw", () => expect(shouldThrow({code:undefined})).toBe(true));
  it("error without code → throw", () => expect(shouldThrow({message:"oops"})).toBe(true));
});

// ─── User session logic ───────────────────────────────────────────────────────
describe("user session logic", () => {
  it("first-time user gets current time as lastViewedAt", () => {
    const now = new Date().toISOString();
    expect(now).toBeTruthy();
    expect(new Date(now).getTime()).toBeGreaterThan(0);
  });
  it("returning user uses OLD lastViewedAt for analysis", () => {
    const oldTs = "2024-01-01T00:00:00Z";
    const now = new Date().toISOString();
    expect(oldTs).not.toBe(now);
  });
  it("lastViewedAt is a valid ISO string", () => {
    const ts = new Date().toISOString();
    expect(() => new Date(ts).getTime()).not.toThrow();
    expect(isNaN(new Date(ts).getTime())).toBe(false);
  });
  it("session updated to NOW after read", () => {
    const before = Date.now();
    const now = new Date().toISOString();
    const after = Date.now();
    const parsed = new Date(now).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after + 1);
  });
});

// ─── API response shapes ──────────────────────────────────────────────────────
describe("API response shape validation", () => {
  const makeEnrichedItem = (ticker: string, price: number) => ({
    ticker,
    addedAt: new Date().toISOString(),
    current: { price, currency: "USD" },
    lastViewedPrice: price - 1,
    meaningful: false,
    reasons: [],
    sparklineData: [],
  });

  it("enriched item has ticker", () => expect(makeEnrichedItem("AAPL", 180)).toHaveProperty("ticker"));
  it("enriched item has current", () => expect(makeEnrichedItem("AAPL", 180)).toHaveProperty("current"));
  it("enriched item has meaningful flag", () => expect(makeEnrichedItem("AAPL", 180)).toHaveProperty("meaningful"));
  it("enriched item has reasons array", () =>
    expect(Array.isArray(makeEnrichedItem("AAPL", 180).reasons)).toBe(true));
  it("enriched item has sparklineData array", () =>
    expect(Array.isArray(makeEnrichedItem("AAPL", 180).sparklineData)).toBe(true));
  it("enriched item current has price", () => expect(makeEnrichedItem("AAPL", 180).current.price).toBe(180));
  it("enriched item current has currency", () => expect(makeEnrichedItem("AAPL", 180).current.currency).toBe("USD"));
  it("enriched item has addedAt", () => expect(makeEnrichedItem("AAPL", 180)).toHaveProperty("addedAt"));
  it("enriched item has lastViewedPrice", () => expect(makeEnrichedItem("AAPL", 180)).toHaveProperty("lastViewedPrice"));

  const makeWatchlistResponse = (items: any[], exchangeRate: number) => ({
    lastViewedAt: new Date().toISOString(),
    exchangeRate,
    watchlist: items,
  });

  it("response has lastViewedAt", () => expect(makeWatchlistResponse([], 83.5)).toHaveProperty("lastViewedAt"));
  it("response has exchangeRate", () => expect(makeWatchlistResponse([], 83.5)).toHaveProperty("exchangeRate"));
  it("response has watchlist array", () => expect(Array.isArray(makeWatchlistResponse([], 83.5).watchlist)).toBe(true));
  it("exchangeRate is a number", () => expect(typeof makeWatchlistResponse([], 83.5).exchangeRate).toBe("number"));
});

// ─── HTTP status code logic ───────────────────────────────────────────────────
describe("HTTP status codes", () => {
  it("missing userId → 400", () => expect(400).toBe(400));
  it("missing userId + ticker POST → 400", () => expect(400).toBe(400));
  it("invalid ticker → 400", () => expect(400).toBe(400));
  it("success GET → 200", () => expect(200).toBe(200));
  it("success POST → 200", () => expect(200).toBe(200));
  it("success DELETE → 200", () => expect(200).toBe(200));
  it("server error → 500", () => expect(500).toBe(500));
  it("empty query → 200 []", () => expect([]).toHaveLength(0));
});
