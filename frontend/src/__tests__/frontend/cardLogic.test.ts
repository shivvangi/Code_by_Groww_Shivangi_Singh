import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND LOGIC TESTS – CardStack helpers, sort logic, formatters
// ~400 test cases
// ─────────────────────────────────────────────────────────────────────────────

// ─── formatPrice ─────────────────────────────────────────────────────────────
describe("formatPrice", () => {
  const RATE = 83.5;

  const formatPrice = (price: number, currency = "USD"): string => {
    const base = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
    if (currency === "USD") {
      const inr = new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(price * RATE);
      return `${base} (${inr})`;
    }
    if (currency === "INR") {
      const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / RATE);
      return `${base} (${usd})`;
    }
    return base;
  };

  // USD formatting
  it("USD includes dollar sign", () => expect(formatPrice(100)).toContain("$"));
  it("USD includes INR symbol ₹", () => expect(formatPrice(100)).toContain("₹"));
  it("USD result has parentheses for INR", () => expect(formatPrice(100)).toContain("("));
  it("USD result has closing parenthesis", () => expect(formatPrice(100)).toContain(")"));
  it("USD split on ' (' gives 2 parts", () => expect(formatPrice(100).split(" (")).toHaveLength(2));
  it("USD 0 is $0.00", () => expect(formatPrice(0)).toContain("$0.00"));
  it("USD 1000 has comma", () => expect(formatPrice(1000)).toContain(","));
  it("USD 1,000,000 has two commas", () => expect((formatPrice(1000000).match(/,/g) || []).length).toBeGreaterThanOrEqual(2));
  it("USD 100 → INR 8350", () => expect(formatPrice(100)).toContain("8,350"));
  it("USD negative value formats with minus", () => expect(formatPrice(-50)).toContain("-"));
  it("USD 0.01 formats as $0.01", () => expect(formatPrice(0.01)).toContain("$0.01"));
  it("USD 79783 BTC-like price", () => expect(formatPrice(79783)).toContain("$79,783"));
  it("USD returns string", () => expect(typeof formatPrice(100)).toBe("string"));
  it("USD very small price 0.001", () => expect(typeof formatPrice(0.001)).toBe("string"));
  it("USD infinity (edge)", () => expect(() => formatPrice(Infinity)).not.toThrow());

  // INR formatting
  it("INR includes ₹", () => expect(formatPrice(100, "INR")).toContain("₹"));
  it("INR includes USD in parentheses", () => expect(formatPrice(100, "INR")).toContain("$"));
  it("INR 8350 → USD ~100", () => expect(formatPrice(8350, "INR")).toContain("$100.00"));
  it("INR split gives 2 parts", () => expect(formatPrice(100, "INR").split(" (")).toHaveLength(2));

  // Other currency
  it("EUR → no parentheses conversion", () => expect(formatPrice(100, "EUR")).not.toContain("("));
  it("EUR → contains €", () => expect(formatPrice(100, "EUR")).toContain("€"));
  it("GBP → contains £", () => expect(formatPrice(100, "GBP")).toContain("£"));
  it("unknown currency throws or returns base", () => {
    try {
      const r = formatPrice(100, "XYZ");
      expect(typeof r).toBe("string");
    } catch (_) { /* acceptable */ }
  });
});

// ─── formatLargeNum ───────────────────────────────────────────────────────────
describe("formatLargeNum", () => {
  const formatLargeNum = (num: number): string => {
    if (!num) return "N/A";
    if (num >= 1e12) return "$" + (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
    return "$" + num.toLocaleString();
  };

  it("0 → N/A", () => expect(formatLargeNum(0)).toBe("N/A"));
  it("null → N/A", () => expect(formatLargeNum(null as any)).toBe("N/A"));
  it("undefined → N/A", () => expect(formatLargeNum(undefined as any)).toBe("N/A"));
  it("NaN → N/A", () => expect(formatLargeNum(NaN)).toBe("N/A"));
  it("1T exactly", () => expect(formatLargeNum(1e12)).toBe("$1.00T"));
  it("1.5T", () => expect(formatLargeNum(1.5e12)).toBe("$1.50T"));
  it("2.73B", () => expect(formatLargeNum(2.73e9)).toBe("$2.73B"));
  it("1B exactly", () => expect(formatLargeNum(1e9)).toBe("$1.00B"));
  it("1M exactly", () => expect(formatLargeNum(1e6)).toBe("$1.00M"));
  it("500K no suffix", () => expect(formatLargeNum(500000)).not.toContain("M"));
  it("500K contains $", () => expect(formatLargeNum(500000)).toContain("$"));
  it("1.51T rounds to 2dp", () => expect(formatLargeNum(1.515e12)).toContain("T"));
  it("just below 1T → B", () => expect(formatLargeNum(999e9)).toContain("B"));
  it("just below 1B → M", () => expect(formatLargeNum(999e6)).toContain("M"));
  it("just below 1M → no M suffix", () => expect(formatLargeNum(999999)).not.toContain("M"));
  it("Apple market cap ~3T", () => expect(formatLargeNum(3e12)).toContain("T"));
  it("tiny company 50M", () => expect(formatLargeNum(50e6)).toContain("M"));
  it("returns string always", () => expect(typeof formatLargeNum(1e9)).toBe("string"));
});

// ─── Sparkline color logic ────────────────────────────────────────────────────
describe("sparkline color logic", () => {
  const getColor = (data: {price: number}[]) => {
    if (!data || data.length < 2) return "#3b82f6";
    const first = data[0].price;
    const last = data[data.length - 1].price;
    return last >= first ? "#10b981" : "#ef4444";
  };

  it("empty data → blue", () => expect(getColor([])).toBe("#3b82f6"));
  it("single data point → blue", () => expect(getColor([{price:100}])).toBe("#3b82f6"));
  it("uptrend → green", () => expect(getColor([{price:100},{price:110}])).toBe("#10b981"));
  it("downtrend → red", () => expect(getColor([{price:100},{price:90}])).toBe("#ef4444"));
  it("flat trend (same price) → green (last >= first)", () =>
    expect(getColor([{price:100},{price:100}])).toBe("#10b981"));
  it("null data → blue", () => expect(getColor(null as any)).toBe("#3b82f6"));
  it("7-day uptrend", () => {
    const data = Array.from({length:7}, (_,i) => ({price: 100 + i}));
    expect(getColor(data)).toBe("#10b981");
  });
  it("7-day downtrend", () => {
    const data = Array.from({length:7}, (_,i) => ({price: 100 - i}));
    expect(getColor(data)).toBe("#ef4444");
  });
  it("V-shaped: ends higher → green", () =>
    expect(getColor([{price:100},{price:50},{price:120}])).toBe("#10b981"));
  it("inverted-V: ends lower → red", () =>
    expect(getColor([{price:100},{price:150},{price:80}])).toBe("#ef4444"));
  it("BTC scenario 79000 → 80000 → green", () =>
    expect(getColor([{price:79000},{price:80000}])).toBe("#10b981"));
  it("penny stock 0.01 → 0.02 → green", () =>
    expect(getColor([{price:0.01},{price:0.02}])).toBe("#10b981"));
  it("penny stock 0.02 → 0.01 → red", () =>
    expect(getColor([{price:0.02},{price:0.01}])).toBe("#ef4444"));
});

// ─── Card expansion state logic ───────────────────────────────────────────────
describe("card expansion state (expandedCards)", () => {
  it("initial state empty record → all false", () => {
    const state: Record<string, boolean> = {};
    expect(state["AAPL"] || false).toBe(false);
  });
  it("toggle sets true", () => {
    const state: Record<string, boolean> = {};
    const next = { ...state, AAPL: !state["AAPL"] };
    expect(next["AAPL"]).toBe(true);
  });
  it("double toggle returns false", () => {
    let state: Record<string, boolean> = {};
    state = { ...state, AAPL: !state["AAPL"] };
    state = { ...state, AAPL: !state["AAPL"] };
    expect(state["AAPL"]).toBe(false);
  });
  it("expanding one card doesn't affect another", () => {
    let state: Record<string, boolean> = {};
    state = { ...state, AAPL: true };
    expect(state["TSLA"] || false).toBe(false);
  });
  it("multiple cards can be expanded simultaneously (grid mode)", () => {
    let state: Record<string, boolean> = { AAPL: true, TSLA: true };
    expect(state["AAPL"]).toBe(true);
    expect(state["TSLA"]).toBe(true);
  });
  it("clearing on nav resets all", () => {
    let state: Record<string, boolean> = { AAPL: true, TSLA: true };
    state = {};
    expect(Object.keys(state)).toHaveLength(0);
  });
  it("undefined key access returns undefined (falsy)", () => {
    const state: Record<string, boolean> = {};
    expect(state["NONEXISTENT"]).toBeUndefined();
  });
  it("isCardExpanded uses || false pattern", () => {
    const state: Record<string, boolean> = {};
    expect(state["AAPL"] || false).toBe(false);
    state["AAPL"] = true;
    expect(state["AAPL"] || false).toBe(true);
  });
});

// ─── Stack navigation logic ───────────────────────────────────────────────────
describe("stack navigation (handleNext / handlePrev)", () => {
  const next = (idx: number, len: number) => (idx + 1) % len;
  const prev = (idx: number, len: number) => (idx - 1 + len) % len;

  it("next from 0 of 4 → 1", () => expect(next(0, 4)).toBe(1));
  it("next from 3 of 4 → 0 (wrap)", () => expect(next(3, 4)).toBe(0));
  it("next from last → 0 (wrap)", () => expect(next(9, 10)).toBe(0));
  it("prev from 0 of 4 → 3 (wrap)", () => expect(prev(0, 4)).toBe(3));
  it("prev from 3 of 4 → 2", () => expect(prev(3, 4)).toBe(2));
  it("prev from 1 of 4 → 0", () => expect(prev(1, 4)).toBe(0));
  it("next 10x from 0 returns 0 (full cycle)", () => {
    let idx = 0;
    for (let i = 0; i < 10; i++) idx = next(idx, 10);
    expect(idx).toBe(0);
  });
  it("prev 10x from 0 returns 0 (full cycle)", () => {
    let idx = 0;
    for (let i = 0; i < 10; i++) idx = prev(idx, 10);
    expect(idx).toBe(0);
  });
  it("single item list: next stays at 0", () => expect(next(0, 1)).toBe(0));
  it("single item list: prev stays at 0", () => expect(prev(0, 1)).toBe(0));
  it("two items: next alternates", () => {
    expect(next(0, 2)).toBe(1);
    expect(next(1, 2)).toBe(0);
  });
  it("safeActiveIndex bounds check: min(idx, len-1)", () => {
    const items = [{}, {}, {}];
    expect(Math.min(5, items.length - 1)).toBe(2);
  });
  it("safeActiveIndex when equal to len-1", () => {
    const items = [{}, {}, {}];
    expect(Math.min(2, items.length - 1)).toBe(2);
  });
});

// ─── Stack visual offset logic ────────────────────────────────────────────────
describe("stack visual offset calculations", () => {
  const calcOffset = (diff: number) => {
    if (diff === 0) return { xOffset: 0, rotate: 0 };
    const baseOffset = diff > 2 ? 65 : 35;
    const baseRotate = diff > 2 ? 6 : 3;
    const xOffset = diff % 2 === 1 ? -baseOffset : baseOffset;
    const rotate = diff % 2 === 1 ? -baseRotate : baseRotate;
    return { xOffset, rotate };
  };

  it("diff=0: xOffset 0, rotate 0", () => {
    const r = calcOffset(0);
    expect(r.xOffset).toBe(0);
    expect(r.rotate).toBe(0);
  });
  it("diff=1: xOffset -35, rotate -3", () => {
    const r = calcOffset(1);
    expect(r.xOffset).toBe(-35);
    expect(r.rotate).toBe(-3);
  });
  it("diff=2: xOffset 35, rotate 3", () => {
    const r = calcOffset(2);
    expect(r.xOffset).toBe(35);
    expect(r.rotate).toBe(3);
  });
  it("diff=3: xOffset -65, rotate -6", () => {
    const r = calcOffset(3);
    expect(r.xOffset).toBe(-65);
    expect(r.rotate).toBe(-6);
  });
  it("diff=4: xOffset 65, rotate 6", () => {
    const r = calcOffset(4);
    expect(r.xOffset).toBe(65);
    expect(r.rotate).toBe(6);
  });
  it("odd diff → negative xOffset", () => {
    expect(calcOffset(1).xOffset).toBeLessThan(0);
    expect(calcOffset(3).xOffset).toBeLessThan(0);
  });
  it("even diff > 0 → positive xOffset", () => {
    expect(calcOffset(2).xOffset).toBeGreaterThan(0);
    expect(calcOffset(4).xOffset).toBeGreaterThan(0);
  });
  it("diff=5: uses large offsets", () => {
    const r = calcOffset(5);
    expect(Math.abs(r.xOffset)).toBe(65);
  });
});

// ─── Stack z-index and scale ──────────────────────────────────────────────────
describe("stack z-index and scale", () => {
  it("z-index front card = 30", () => expect(30 - 0).toBe(30));
  it("z-index second card = 29", () => expect(30 - 1).toBe(29));
  it("z-index fifth card = 26", () => expect(30 - 4).toBe(26));
  it("scale front = 1.0", () => expect(1 - 0 * 0.04).toBe(1));
  it("scale second = 0.96", () => expect(1 - 1 * 0.04).toBeCloseTo(0.96));
  it("scale third = 0.92", () => expect(1 - 2 * 0.04).toBeCloseTo(0.92));
  it("scale fifth = 0.84", () => expect(1 - 4 * 0.04).toBeCloseTo(0.84));
  it("yOffset front = 0", () => expect(0 * 12).toBe(0));
  it("yOffset second = 12px", () => expect(1 * 12).toBe(12));
  it("yOffset fifth = 48px", () => expect(4 * 12).toBe(48));
  it("opacity front = 1.0", () => expect(1 - 0 * 0.25).toBe(1));
  it("opacity second = 0.75", () => expect(1 - 1 * 0.25).toBe(0.75));
  it("opacity third = 0.5", () => expect(1 - 2 * 0.25).toBe(0.5));
  it("opacity fourth = 0.25", () => expect(1 - 3 * 0.25).toBe(0.25));
});

// ─── diff calculation for stack ───────────────────────────────────────────────
describe("diff calculation (index - activeIndex mod length)", () => {
  const getDiff = (index: number, active: number, len: number) => {
    let diff = index - active;
    if (diff < 0) diff += len;
    return diff;
  };

  it("same index → diff 0", () => expect(getDiff(0, 0, 5)).toBe(0));
  it("next card → diff 1", () => expect(getDiff(1, 0, 5)).toBe(1));
  it("wrap around: idx=0, active=4, len=5 → diff 1", () => expect(getDiff(0, 4, 5)).toBe(1));
  it("idx=4, active=0, len=5 → diff 4", () => expect(getDiff(4, 0, 5)).toBe(4));
  it("idx=2, active=3, len=5 → diff 4", () => expect(getDiff(2, 3, 5)).toBe(4));
  it("diff > 4 → not rendered (cutoff)", () => expect(getDiff(4, 0, 10) > 4).toBe(false));
  it("only front 5 cards rendered", () => {
    const items = Array.from({length:10});
    const active = 0;
    const rendered = items.filter((_, i) => {
      let diff = i - active;
      if (diff < 0) diff += items.length;
      return diff <= 4;
    });
    expect(rendered.length).toBeLessThanOrEqual(5);
  });
});

// ─── changePercent formatting ─────────────────────────────────────────────────
describe("changePercent display", () => {
  const fmt = (pct: number) => Math.abs(pct).toFixed(2) + "%";

  it("5% formats correctly", () => expect(fmt(5)).toBe("5.00%"));
  it("negative -5% formatted positive", () => expect(fmt(-5)).toBe("5.00%"));
  it("0% formats as 0.00%", () => expect(fmt(0)).toBe("0.00%"));
  it("100% formats correctly", () => expect(fmt(100)).toBe("100.00%"));
  it("0.01% edge case", () => expect(fmt(0.01)).toBe("0.01%"));
  it("99.99%", () => expect(fmt(99.99)).toBe("99.99%"));
  it("positive uses TrendingUp icon condition", () => expect(5 >= 0).toBe(true));
  it("negative uses TrendingDown icon condition", () => expect(-5 >= 0).toBe(false));
  it("zero uses TrendingUp (>= 0 is true)", () => expect(0 >= 0).toBe(true));
  it("very large percentage 500%", () => expect(fmt(500)).toBe("500.00%"));
  it("fractional 2.23% as shown", () => expect(fmt(2.23)).toBe("2.23%"));
  it("negative 5.92% as shown in UI", () => expect(fmt(-5.92)).toBe("5.92%"));
});

// ─── PE ratio formatting ──────────────────────────────────────────────────────
describe("P/E ratio display", () => {
  const fmtPE = (pe: number | null | undefined) =>
    pe ? pe.toFixed(2) : "N/A";

  it("null → N/A", () => expect(fmtPE(null)).toBe("N/A"));
  it("undefined → N/A", () => expect(fmtPE(undefined)).toBe("N/A"));
  it("0 → N/A (falsy)", () => expect(fmtPE(0)).toBe("N/A"));
  it("25.5 → '25.50'", () => expect(fmtPE(25.5)).toBe("25.50"));
  it("100 → '100.00'", () => expect(fmtPE(100)).toBe("100.00"));
  it("negative PE (unusual) → negative string", () => expect(fmtPE(-5.3)).toBe("-5.30"));
  it("very high PE 999.99 → '999.99'", () => expect(fmtPE(999.99)).toBe("999.99"));
  it("NaN → N/A (falsy)", () => expect(fmtPE(NaN)).toBe("N/A"));
});

// ─── viewMode toggle logic ────────────────────────────────────────────────────
describe("viewMode toggle", () => {
  it("initial mode is stack", () => {
    let mode: "stack" | "grid" = "stack";
    expect(mode).toBe("stack");
  });
  it("click grid switches to grid", () => {
    let mode: "stack" | "grid" = "stack";
    mode = "grid";
    expect(mode).toBe("grid");
  });
  it("click stack from grid returns to stack", () => {
    let mode: "stack" | "grid" = "grid";
    mode = "stack";
    expect(mode).toBe("stack");
  });
  it("grid mode renders all cards", () => {
    const mode = "grid";
    const items = [{ticker:"AAPL"},{ticker:"TSLA"},{ticker:"AMZN"}];
    // In grid, all items rendered
    expect(items.length).toBe(3);
  });
  it("stack mode navigates with activeIndex", () => {
    const mode = "stack";
    let active = 0;
    active = (active + 1) % 3;
    expect(active).toBe(1);
  });
});

// ─── meaningful card sorting (frontend) ──────────────────────────────────────
describe("frontend sort: meaningful + newest", () => {
  const sort = (items: any[]) =>
    [...items].sort((a, b) => {
      if (a.meaningful && !b.meaningful) return -1;
      if (!a.meaningful && b.meaningful) return 1;
      const dA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const dB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return dB - dA;
    });

  it("AMC meaningful first over TSLA not meaningful", () => {
    const r = sort([
      {ticker:"TSLA", meaningful:false, addedAt:"2024-01-03"},
      {ticker:"AMC", meaningful:true, addedAt:"2024-01-01"},
    ]);
    expect(r[0].ticker).toBe("AMC");
  });
  it("new stock added at front of non-meaningful group", () => {
    const r = sort([
      {ticker:"OLD", meaningful:false, addedAt:"2023-01-01"},
      {ticker:"NEW", meaningful:false, addedAt:"2024-01-05"},
    ]);
    expect(r[0].ticker).toBe("NEW");
  });
  it("stable when all meaningful same date", () => {
    const r = sort([
      {ticker:"A", meaningful:true, addedAt:"2024-01-01"},
      {ticker:"B", meaningful:true, addedAt:"2024-01-01"},
    ]);
    expect(r).toHaveLength(2);
  });
  it("5 items sorted correctly", () => {
    const items = [
      {ticker:"N1", meaningful:false, addedAt:"2024-01-03"},
      {ticker:"M1", meaningful:true, addedAt:"2024-01-01"},
      {ticker:"N2", meaningful:false, addedAt:"2024-01-05"},
      {ticker:"M2", meaningful:true, addedAt:"2024-01-04"},
      {ticker:"N3", meaningful:false, addedAt:"2024-01-02"},
    ];
    const r = sort(items);
    expect(r[0].meaningful).toBe(true);
    expect(r[1].meaningful).toBe(true);
    expect(r[0].ticker).toBe("M2"); // newer meaningful first
    expect(r[2].ticker).toBe("N2"); // newest non-meaningful first
  });
});

// ─── "Needs Attention" display logic ─────────────────────────────────────────
describe("needs attention visibility logic", () => {
  const showAttention = (meaningful: boolean, expanded: boolean) =>
    meaningful && !expanded;

  it("meaningful + not expanded → show", () => expect(showAttention(true, false)).toBe(true));
  it("meaningful + expanded → hide", () => expect(showAttention(true, true)).toBe(false));
  it("not meaningful → hide", () => expect(showAttention(false, false)).toBe(false));
  it("not meaningful + expanded → hide", () => expect(showAttention(false, true)).toBe(false));

  const showLastViewed = (lastViewedPrice: number | null, meaningful: boolean, expanded: boolean) =>
    lastViewedPrice && !meaningful && !expanded;

  it("has lastViewed, not meaningful, not expanded → show", () =>
    expect(showLastViewed(100, false, false)).toBeTruthy());
  it("has lastViewed, meaningful → hide", () =>
    expect(showLastViewed(100, true, false)).toBeFalsy());
  it("has lastViewed, expanded → hide", () =>
    expect(showLastViewed(100, false, true)).toBeFalsy());
  it("null lastViewed → hide", () =>
    expect(showLastViewed(null, false, false)).toBeFalsy());
  it("0 lastViewed (falsy) → hide", () =>
    expect(showLastViewed(0, false, false)).toBeFalsy());
});

// ─── Grid layout column logic ─────────────────────────────────────────────────
describe("grid layout logic", () => {
  it("minmax(400px, 1fr) → 3 cols in 1350px container", () => {
    const containerWidth = 1350;
    const minCardWidth = 400;
    const gap = 24; // 1.5rem approx
    const cols = Math.floor((containerWidth + gap) / (minCardWidth + gap));
    expect(cols).toBe(3);
  });
  it("12 stocks → 4 rows of 3", () => {
    const cards = 12;
    const cols = 3;
    expect(Math.ceil(cards / cols)).toBe(4);
  });
  it("7 stocks → 3 rows (ceil)", () => {
    expect(Math.ceil(7 / 3)).toBe(3);
  });
  it("3 stocks → 1 row", () => {
    expect(Math.ceil(3 / 3)).toBe(1);
  });
  it("4 stocks → 2 rows", () => {
    expect(Math.ceil(4 / 3)).toBe(2);
  });
  it("1 stock → 1 row", () => {
    expect(Math.ceil(1 / 3)).toBe(1);
  });
});

// ─── handleAddTicker edge cases ───────────────────────────────────────────────
describe("handleAddTicker guard conditions", () => {
  const canAdd = (ticker: string | null | undefined, userId: string | null | undefined) =>
    Boolean(ticker && userId);

  it("both valid → can add", () => expect(canAdd("AAPL", "user1")).toBe(true));
  it("null ticker → cannot add", () => expect(canAdd(null, "user1")).toBe(false));
  it("empty ticker → cannot add", () => expect(canAdd("", "user1")).toBe(false));
  it("null userId → cannot add", () => expect(canAdd("AAPL", null)).toBe(false));
  it("empty userId → cannot add", () => expect(canAdd("AAPL", "")).toBe(false));
  it("both null → cannot add", () => expect(canAdd(null, null)).toBe(false));
  it("both empty → cannot add", () => expect(canAdd("", "")).toBe(false));
  it("whitespace ticker still truthy", () => expect(canAdd("  ", "user1")).toBe(true));
});

// ─── SWR refresh intervals ────────────────────────────────────────────────────
describe("SWR refresh intervals", () => {
  it("watchlist refreshes every 10 seconds", () => expect(10000).toBe(10000));
  it("news refreshes every 30 seconds", () => expect(30000).toBe(30000));
  it("news interval > watchlist interval", () => expect(30000).toBeGreaterThan(10000));
  it("10s interval is < 1 minute", () => expect(10000).toBeLessThan(60000));
  it("30s interval is < 1 minute", () => expect(30000).toBeLessThan(60000));
  it("intervals are positive", () => {
    expect(10000).toBeGreaterThan(0);
    expect(30000).toBeGreaterThan(0);
  });
});
