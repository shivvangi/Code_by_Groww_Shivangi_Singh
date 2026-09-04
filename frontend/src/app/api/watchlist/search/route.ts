import { NextRequest, NextResponse } from "next/server";
import { MarketDataService } from "@/lib/marketData";

export const dynamic = "force-dynamic";

/**
 * GET /api/watchlist/search?q=AAPL
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const results = await MarketDataService.searchTickers(query);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Watchlist search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
