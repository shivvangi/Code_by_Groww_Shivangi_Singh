import yahooFinanceClass from "yahoo-finance2";
const yahooFinance = new (yahooFinanceClass as any)();

const quoteCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 1000; // 10 seconds

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
        marketState: quote.marketState,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      };

      quoteCache.set(ticker, { data: result, timestamp: now });
      return result;
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      if (quoteCache.has(ticker)) {
         return quoteCache.get(ticker)?.data;
      }
      return null;
    }
  }

  /**
   * Fetches historical data to find the price at a specific timestamp.
   */
  static async getPriceAtTimestamp(ticker: string, timestamp: Date) {
    try {
      const startDate = new Date(timestamp);
      startDate.setDate(startDate.getDate() - 5);
      
      const endDate = new Date(timestamp);
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

      let closestQuote = historical[0];
      for (const day of historical) {
         if (day.date <= timestamp) {
             closestQuote = day;
         } else {
             break;
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
   */
  static isMeaningfulChange(currentQuote: any, oldPrice: number | null) {
      if (!currentQuote) return { meaningful: false, reasons: [] };

      let meaningful = false;
      const reasons: string[] = [];

      if (currentQuote.volume && currentQuote.averageVolume) {
          const volumeRatio = currentQuote.volume / currentQuote.averageVolume;
          if (volumeRatio > 1.5) {
              meaningful = true;
              reasons.push("Unusual Volume");
          }
      }

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
   * Fetch recent news for a given list of tickers
   */
  static async getNewsForTickers(tickers: string[]) {
    try {
      const allNews: any[] = [];
      const topTickers = tickers.slice(0, 3);
      
      for (const ticker of topTickers) {
        const results = await yahooFinance.search(ticker);
        if (results.news) {
          allNews.push(...results.news.slice(0, 5));
        }
      }

      allNews.sort((a, b) => new Date(b.providerPublishTime).getTime() - new Date(a.providerPublishTime).getTime());
      
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
      return 83.5;
    }
  }
}
