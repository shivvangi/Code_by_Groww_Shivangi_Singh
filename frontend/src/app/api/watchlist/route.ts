import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MarketDataService } from "@/lib/marketData";

export const dynamic = "force-dynamic";

/**
 * GET /api/watchlist?userId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    // 1. Get or create user session to fetch last_viewed_at
    const { data: session } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .single();

    let lastViewedAt = session?.last_viewed_at;
    const now = new Date().toISOString();

    if (!session) {
      const { error: createError } = await supabase
        .from("user_sessions")
        .insert([{ user_id: userId, last_viewed_at: now }])
        .select()
        .single();

      if (createError) throw createError;
      lastViewedAt = now;
    } else {
      await supabase
        .from("user_sessions")
        .update({ last_viewed_at: now })
        .eq("user_id", userId);
    }

    // 2. Fetch the user's watchlist tickers
    const { data: watchlistData, error: wlError } = await supabase
      .from("watchlists")
      .select("ticker, added_at")
      .eq("user_id", userId);

    if (wlError) throw wlError;

    const tickerInfo = watchlistData || [];

    // 3. Gather market data and analyze changes
    const enrichedWatchlist = await Promise.all(
      tickerInfo.map(async (row) => {
        const ticker = row.ticker;
        const addedAt = row.added_at;
        const currentQuote = await MarketDataService.getQuote(ticker);
        const oldPrice = await MarketDataService.getPriceAtTimestamp(
          ticker,
          new Date(lastViewedAt)
        );
        const analysis = MarketDataService.isMeaningfulChange(
          currentQuote,
          oldPrice
        );
        const sparklineData = await MarketDataService.get7DayHistory(ticker);

        return {
          ticker,
          addedAt,
          current: currentQuote,
          lastViewedPrice: oldPrice,
          meaningful: analysis.meaningful,
          reasons: analysis.reasons,
          sparklineData,
        };
      })
    );

    const exchangeRate = await MarketDataService.getExchangeRate();

    return NextResponse.json({
      lastViewedAt,
      exchangeRate,
      watchlist: enrichedWatchlist,
    });
  } catch (error: any) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist
 * Body: { userId: "xxx", ticker: "AAPL" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ticker } = body || {};

    if (!userId || !ticker) {
      return NextResponse.json(
        { error: "userId and ticker are required" },
        { status: 400 }
      );
    }

    const normalizedTicker = ticker.toUpperCase();

    const quote = await MarketDataService.getQuote(normalizedTicker);
    if (!quote || !quote.price) {
      return NextResponse.json(
        { error: "Invalid ticker symbol or data unavailable" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("watchlists")
      .insert([{ user_id: userId, ticker: normalizedTicker }]);

    if (error && error.code !== "23505") {
      throw error;
    }

    return NextResponse.json({ success: true, ticker: normalizedTicker });
  } catch (error: any) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/watchlist
 * Body: { userId: "xxx", ticker: "AAPL" }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ticker } = body || {};

    if (!userId || !ticker) {
      return NextResponse.json(
        { error: "userId and ticker are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("watchlists")
      .delete()
      .match({ user_id: userId, ticker: ticker.toUpperCase() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
