import yahooFinanceClass from "yahoo-finance2";
const yahooFinance = new (yahooFinanceClass as any)();
// In-memory cache to avoid rate limiting
// Key: ticker, Value: { data: Quote, timestamp: number }
const quoteCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export class MarketDataService {
  /**
   * Fetches the current quote for a ticker, using an in-memory cache to prevent rate-limits.
   */
  static async getQuote(ticker: string) {
    try {
      const now = Date.now();
      const cached = quoteCache.get(ticker);

      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const quote = (await yahooFinance.quote(ticker)) as any;
      
      const result = {
        symbol: quote.symbol,
        longName: quote.longName || quote.shortName,
        currency: quote.currency || "USD",
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        averageVolume: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month,
        marketState: quote.marketState, // e.g. "REGULAR", "CLOSED"
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      };

      quoteCache.set(ticker, { data: result, timestamp: now });
      return result;
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      // Return null or cached value if available
      if (quoteCache.has(ticker)) {
         console.log(`Returning stale cached data for ${ticker}`);
         return quoteCache.get(ticker)?.data;
      }
      return null;
    }
  }

  /**
   * Fetches historical data to find the price at a specific timestamp.
   * If the timestamp is outside market hours, it finds the closest closing price before it.
   */
  static async getPriceAtTimestamp(ticker: string, timestamp: Date) {
    try {
      // Get historical data for the last 5 days just to be safe (in case of weekends/holidays)
      const startDate = new Date(timestamp);
      startDate.setDate(startDate.getDate() - 5);
      
      const endDate = new Date(timestamp);
      // Add one day to end date to ensure we cover the timestamp if it's during the day
      endDate.setDate(endDate.getDate() + 1);

      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: "1d" as const,
      };

      const chartData = (await yahooFinance.chart(ticker, queryOptions)) as any;
      const historical = chartData.quotes.filter((q: any) => q.close !== null);
      
      if (!historical || historical.length === 0) {
        return null;
      }

      // Find the closest data point on or before the given timestamp
      let closestQuote = historical[0];
      for (const day of historical) {
         if (day.date <= timestamp) {
             closestQuote = day;
         } else {
             break; // Since it's ordered by date, once we pass the timestamp we can stop
         }
      }

      return closestQuote.close;
    } catch (error) {
      console.error(`Error fetching historical data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Analyzes if the change since last viewed is "meaningful".
   * For this implementation, a meaningful change is:
   * 1. Price moved by > 2% since last viewed.
   * 2. Or, current volume is > 150% of the average volume.
   */
  static isMeaningfulChange(currentQuote: any, oldPrice: number | null) {
      if (!currentQuote) return { meaningful: false, reasons: [] };

      let meaningful = false;
      const reasons: string[] = [];

      // Check volume spike
      if (currentQuote.volume && currentQuote.averageVolume) {
          const volumeRatio = currentQuote.volume / currentQuote.averageVolume;
          if (volumeRatio > 1.5) {
              meaningful = true;
              reasons.push("Unusual Volume");
          }
      }

      // Check price change since last viewed
      if (oldPrice) {
          const priceChange = currentQuote.price - oldPrice;
          const percentChange = (priceChange / oldPrice) * 100;
          
          if (Math.abs(percentChange) >= 2.0) {
              meaningful = true;
              reasons.push(`Price moved ${percentChange.toFixed(2)}% since last view`);
          }
      }

      return { meaningful, reasons };
  }

  /**
   * Fetches historical closing prices for the last 7 days for the sparkline chart.
   */
  static async get7DayHistory(ticker: string) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: "1d" as const,
      };

      const chartData = (await yahooFinance.chart(ticker, queryOptions)) as any;
      const historical = chartData.quotes.filter((q: any) => q.close !== null);
      
      if (!historical || historical.length === 0) {
        return [];
      }

      // Map to a simple array of objects for the frontend sparkline
      return historical.map((day: any) => ({
        date: day.date,
        price: day.close
      }));
    } catch (error) {
      console.error(`Error fetching 7-day history for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search for tickers using Yahoo Finance autocomplete
   */
  static async searchTickers(query: string) {
    try {
      const results = await yahooFinance.search(query);
      return results.quotes.slice(0, 5).map((q: any) => ({
        symbol: q.symbol,
        shortname: q.shortname,
        longname: q.longname,
        typeDisp: q.typeDisp,
        exchDisp: q.exchDisp
      }));
    } catch (error) {
      console.error(`Error searching tickers for query ${query}:`, error);
      return [];
    }
  }

  /**
   * Fetch daily top trending symbols
   */
  static async getTrendingSymbols(count: number = 10) {
    try {
      // Use in-memory cache to prevent spamming the trending API
      const cacheKey = "TRENDING_SYMBOLS";
      const now = Date.now();
      const cached = quoteCache.get(cacheKey);
      if (cached && now - cached.timestamp < 60000) { // 1 min cache for trending
        return cached.data.slice(0, count);
      }

      const results = await yahooFinance.trendingSymbols("US");
      if (results && results.quotes) {
        let symbols = results.quotes
          .map((q: any) => q.symbol)
          .filter((sym: string) => !sym.includes('-') && !sym.includes('='));
          
        // Ensure we have at least 'count' symbols by appending defaults if needed
        const fallbacks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"];
        if (symbols.length < count) {
            const needed = count - symbols.length;
            const extra = fallbacks.filter(f => !symbols.includes(f)).slice(0, needed);
            symbols = [...symbols, ...extra];
        }

        quoteCache.set(cacheKey, { data: symbols, timestamp: now });
        return symbols.slice(0, count);
      }
      return ["^NSEI", "RELIANCE.NS", "BTC-USD", "AAPL", "GC=F"].slice(0, count);
    } catch (error) {
      console.error("Error fetching trending symbols:", error);
      return ["^NSEI", "RELIANCE.NS", "BTC-USD", "AAPL", "GC=F"].slice(0, count);
    }
  }

  /**
   * Fetch recent news for a given list of tickers
   */
  static async getNewsForTickers(tickers: string[]) {
    try {
      const allNews: any[] = [];
      // Fetch news for the first 3 tickers to avoid rate limiting
      const topTickers = tickers.slice(0, 3);
      
      for (const ticker of topTickers) {
        const results = await yahooFinance.search(ticker);
        if (results.news) {
          allNews.push(...results.news.slice(0, 5));
        }
      }

      // Sort aggregated news by date descending and return top 8
      allNews.sort((a, b) => new Date(b.providerPublishTime).getTime() - new Date(a.providerPublishTime).getTime());
      
      // Deduplicate by uuid
      const uniqueNews = [];
      const seen = new Set();
      for (const item of allNews) {
        if (!seen.has(item.uuid)) {
          seen.add(item.uuid);
          uniqueNews.push(item);
        }
      }

      return uniqueNews.slice(0, 8);
    } catch (error) {
      console.error(`Error fetching news for tickers:`, error);
      return [];
    }
  }

  /**
   * Fetch live USD/INR exchange rate
   */
  static async getExchangeRate() {
    try {
      // Use cache logic for exchange rate to avoid rate limits
      const cacheKey = "USDINR_FX";
      const now = Date.now();
      const cached = quoteCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const quote = (await yahooFinance.quote("USDINR=X")) as any;
      const rate = quote.regularMarketPrice || 83.5;
      quoteCache.set(cacheKey, { data: rate, timestamp: now });
      return rate;
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      return 83.5; // Fallback estimate
    }
  }
}
