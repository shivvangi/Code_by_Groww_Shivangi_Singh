import { NextRequest, NextResponse } from "next/server";
import { MarketDataService } from "@/lib/marketData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const symbols = ["^NSEI", "RELIANCE.NS", "BTC-USD", "AAPL", "GC=F"]; // Nifty 50, Reliance, BTC, Apple, Gold
    const quotes = await Promise.all(
      symbols.map(async (ticker) => {
        const q = await MarketDataService.getQuote(ticker);
        return {
          ticker,
          name: q?.longName || ticker,
          price: q?.price,
          change: q?.change,
          changePercent: q?.changePercent
        };
      })
    );
    
    return NextResponse.json(quotes.filter(q => q.price != null));
  } catch (error: any) {
    console.error("Indices GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
