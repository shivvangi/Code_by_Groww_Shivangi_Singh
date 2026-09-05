"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useUser, UserProvider } from "@/components/UserProvider";
import { RefreshCw, LayoutGrid, Layers, Activity } from "lucide-react";
import styles from "./watchlist.module.css";
import AutocompleteSearch from "@/components/AutocompleteSearch";
import CardStack from "@/components/CardStack";
import MarketStrip from "@/components/MarketStrip";
import HowItWorks from "@/components/HowItWorks";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

function WatchlistContent() {
  const { userId } = useUser();
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');

  const { data, error, mutate } = useSWR(
    userId ? `/watchlist?userId=${userId}` : null,
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds for real-time feel
  );

  const { data: news = [] } = useSWR(
    userId && data?.watchlist?.length > 0 ? `/watchlist/news?userId=${userId}` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh news every 30 seconds
  );

  const handleAddTicker = async (ticker: string) => {
    if (!ticker || !userId) return;

    setIsAdding(true);
    try {
      await api.post("/watchlist", { userId, ticker });
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add ticker. Ensure it is a valid symbol.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await api.delete("/watchlist", { data: { userId, ticker } });
      mutate();
    } catch (err) {
      alert("Failed to remove ticker.");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await mutate();
    setTimeout(() => setIsSyncing(false), 500);
  };

  if (error) return <div className={styles.loading}>Failed to load watchlist. Error: {error.message || String(error)}</div>;
  if (!data) return <div className={styles.loading}>Loading GrowwSight...</div>;

  const watchlist = data.watchlist || [];

  // Sort logic: 1. Needs Attention (meaningful) -> 2. Everything else (sorted by newest added first)
  const stackedItems = [...watchlist].sort((a: any, b: any) => {
    // 1. Meaningful stocks always jump to the absolute front
    if (a.meaningful && !b.meaningful) return -1;
    if (!a.meaningful && b.meaningful) return 1;
    
    // 2. If both are meaningful, or both are not meaningful, sort by added time (newest first)
    const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return dateB - dateA;
  });

  const formattedDate = data.lastViewedAt ? new Date(data.lastViewedAt).toLocaleString() : 'Unknown';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className={styles.title} style={{ margin: 0 }}>GrowwSight</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className={styles.viewToggleGroup}>
              <button
                onClick={() => setViewMode('stack')}
                className={`${styles.viewToggleButton} ${viewMode === 'stack' ? styles.active : ''}`}
                title="Stack View"
              >
                <Layers size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            <button
              onClick={handleSync}
              className={styles.syncButton}
              disabled={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? styles.spin : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
        <p className={styles.subtitle} style={{ marginTop: '0.5rem' }}>
          Tracking what changed since you last checked ({formattedDate})
        </p>
      </header>

      <MarketStrip />
      <AutocompleteSearch onAdd={handleAddTicker} isAdding={isAdding} />

      {watchlist.length === 0 ? (
        <div className={styles.empty}>
          Your watchlist is empty. Add a ticker above to get started.
        </div>
      ) : (
        <>
          <section className={styles.section} style={{ minHeight: '400px' }}>
            <CardStack items={stackedItems} onRemove={handleRemove} exchangeRate={data.exchangeRate || 83.5} viewMode={viewMode} />
          </section>

          {news.length > 0 && (
            <section className={styles.section} style={{ marginTop: '4rem' }}>
              <h2 className={styles.sectionTitle}>Latest News</h2>
              <div className={styles.newsGrid}>
                {news.map((item: any) => (
                  <a key={item.uuid} href={item.link} target="_blank" rel="noopener noreferrer" className={styles.newsCard}>
                    <div className={styles.newsSource}>{item.publisher}</div>
                    <h3 className={styles.newsTitle}>{item.title}</h3>
                    <div className={styles.newsFooter}>
                      <span className={styles.newsTime}>{new Date(item.providerPublishTime).toLocaleString()}</span>
                      <div className={styles.newsTickers}>
                        {item.relatedTickers?.slice(0, 3).map((t: string) => (
                          <span key={t} className={styles.newsTickerTag}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <HowItWorks />
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <UserProvider>
      <WatchlistContent />
    </UserProvider>
  );
}