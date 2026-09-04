import express from "express";
import { supabase } from "../supabase.js";
import { MarketDataService } from "../services/marketData.js";

export const watchlistRouter = express.Router();

/**
 * Sync user session and get their current watchlist with "Meaningful Change" analysis
 * GET /api/watchlist?userId=xxx
 */
watchlistRouter.get("/", async (req, res) => {
  const userId = req.query.userId as string;
  console.log(`[GET /api/watchlist] Request received for userId: ${userId}`);
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // 1. Get or create user session to fetch last_viewed_at
    let { data: session } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .single();

    let lastViewedAt = session?.last_viewed_at;
    const now = new Date().toISOString();

    if (!session) {
      // First time user
      const { data: newSession, error: createError } = await supabase
        .from("user_sessions")
        .insert([{ user_id: userId, last_viewed_at: now }])
        .select()
        .single();
      
      if (createError) throw createError;
      lastViewedAt = now;
    } else {
      // Update last_viewed_at to NOW, because they are checking it now.
      // But we use the OLD lastViewedAt for our calculations!
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
        // Fetch current live quote
        const currentQuote = await MarketDataService.getQuote(ticker);
        
        // Fetch historical price at lastViewedAt
        const oldPrice = await MarketDataService.getPriceAtTimestamp(ticker, new Date(lastViewedAt));

        // Analyze if meaningful change occurred since last view
        const analysis = MarketDataService.isMeaningfulChange(currentQuote, oldPrice);

        // Fetch 7-day history for the sparkline chart
        const sparklineData = await MarketDataService.get7DayHistory(ticker);

        return {
          ticker,
          addedAt,
          current: currentQuote,
          lastViewedPrice: oldPrice,
          meaningful: analysis.meaningful,
          reasons: analysis.reasons,
          sparklineData
        };
      })
    );

    const exchangeRate = await MarketDataService.getExchangeRate();

    res.json({
      lastViewedAt,
      exchangeRate,
      watchlist: enrichedWatchlist
    });

  } catch (error: any) {
    console.error("Watchlist GET error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * Add a ticker to the watchlist
 * POST /api/watchlist
 * Body: { userId: "xxx", ticker: "AAPL" }
 */
watchlistRouter.post("/", async (req, res) => {
  const { userId, ticker } = req.body;
  if (!userId || !ticker) {
    return res.status(400).json({ error: "userId and ticker are required" });
  }

  const normalizedTicker = ticker.toUpperCase();

  try {
    // Check if valid ticker by fetching a quote
    const quote = await MarketDataService.getQuote(normalizedTicker);
    if (!quote || !quote.price) {
      return res.status(400).json({ error: "Invalid ticker symbol or data unavailable" });
    }

    // Insert into DB
    const { error } = await supabase
      .from("watchlists")
      .insert([{ user_id: userId, ticker: normalizedTicker }]);

    // Ignore unique constraint violations (already in watchlist)
    if (error && error.code !== "23505") {
      throw error;
    }

    res.json({ success: true, ticker: normalizedTicker });
  } catch (error: any) {
    console.error("Watchlist POST error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * Remove a ticker from the watchlist
 * DELETE /api/watchlist
 * Body: { userId: "xxx", ticker: "AAPL" }
 */
watchlistRouter.delete("/", async (req, res) => {
  const { userId, ticker } = req.body;
  if (!userId || !ticker) {
    return res.status(400).json({ error: "userId and ticker are required" });
  }

  try {
    const { error } = await supabase
      .from("watchlists")
      .delete()
      .match({ user_id: userId, ticker: ticker.toUpperCase() });

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Watchlist DELETE error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * Search autocomplete
 * GET /api/watchlist/search?q=AAPL
 */
watchlistRouter.get("/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.json([]);
  }
  
  try {
    const results = await MarketDataService.searchTickers(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get news for a user's watchlist
 * GET /api/watchlist/news?userId=xxx
 */
watchlistRouter.get("/news", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // 1. Fetch user's tickers
    const { data: watchlistData, error: wlError } = await supabase
      .from("watchlists")
      .select("ticker")
      .eq("user_id", userId);

    if (wlError) throw wlError;

    const tickers = watchlistData?.map((row) => row.ticker) || [];
    
    if (tickers.length === 0) {
      return res.json([]);
    }

    // 2. Fetch news
    const news = await MarketDataService.getNewsForTickers(tickers);
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
