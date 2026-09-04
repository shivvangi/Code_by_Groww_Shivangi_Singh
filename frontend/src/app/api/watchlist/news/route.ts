import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MarketDataService } from "@/lib/marketData";

export const dynamic = "force-dynamic";

/**
 * GET /api/watchlist/news?userId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const { data: watchlistData, error: wlError } = await supabase
      .from("watchlists")
      .select("ticker")
      .eq("user_id", userId);

    if (wlError) throw wlError;

    const tickers = watchlistData?.map((row) => row.ticker) || [];

    if (tickers.length === 0) {
      return NextResponse.json([]);
    }

    const news = await MarketDataService.getNewsForTickers(tickers);
    return NextResponse.json(news);
  } catch (error: any) {
    console.error("Watchlist news error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
