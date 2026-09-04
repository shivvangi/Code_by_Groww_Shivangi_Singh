"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useUser, UserProvider } from "@/components/UserProvider";
import { RefreshCw, LayoutGrid, Layers, Info, TrendingUp, Zap, Filter, Layout } from "lucide-react";
import styles from "./watchlist.module.css";
import AutocompleteSearch from "@/components/AutocompleteSearch";
import CardStack from "@/components/CardStack";

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
  if (!data) return <div className={styles.loading}>Loading your smart watchlist...</div>;

  const watchlist = data.watchlist || [];
  
  // Combine all items into a single array, sort by meaningful, then by addedAt (newest first)
  const stackedItems = [...watchlist].sort((a: any, b: any) => {
    if (a.meaningful && !b.meaningful) return -1;
    if (!a.meaningful && b.meaningful) return 1;
    
    // Both meaningful or both not meaningful, sort by addedAt descending
    const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return dateB - dateA;
  });

  const formattedDate = data.lastViewedAt ? new Date(data.lastViewedAt).toLocaleString() : 'Unknown';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className={styles.title} style={{ margin: 0 }}>Smart Watchlist</h1>
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

          <section className={styles.section} style={{ marginTop: '6rem', background: '#f8fafc', padding: '3rem', borderRadius: '1.5rem', border: '1px solid var(--card-border)' }}>
            <h2 className={styles.sectionTitle} style={{ justifyContent: 'center', marginBottom: '2.5rem', fontSize: '2rem' }}>
              <Info className={styles.attention} size={28} /> How Smart Watchlist Works
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              
              <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#e0f2fe', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Zap size={24} color="#0284c7" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Smart Attention Engine</h3>
                <p style={{ color: 'var(--muted-text)', lineHeight: 1.6 }}>
                  Our system continuously monitors your stocks in the background. It automatically flags stocks that need your attention based on significant price drifts or unusual trading volume since you last checked.
                </p>
              </div>

              <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#dcfce7', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Filter size={24} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Intelligent Sorting</h3>
                <p style={{ color: 'var(--muted-text)', lineHeight: 1.6 }}>
                  Your watchlist is dynamically sorted. Stocks flagged with "Needs Attention" always jump to the front, followed immediately by any new stocks you've just added, ensuring you never miss critical movements.
                </p>
              </div>

              <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#f3e8ff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <TrendingUp size={24} color="#9333ea" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Dual-Currency Tracking</h3>
                <p style={{ color: 'var(--muted-text)', lineHeight: 1.6 }}>
                  Track global stocks effortlessly. We fetch live USD/INR exchange rates to instantly convert and display prices, market caps, and highs/lows in both Dollars and Rupees side-by-side.
                </p>
              </div>

              <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#ffedd5', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Layout size={24} color="#ea580c" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Adaptive Layouts</h3>
                <p style={{ color: 'var(--muted-text)', lineHeight: 1.6 }}>
                  Choose how you digest your data. Use the immersive 3D Stack View to focus on one stock at a time, or toggle to the spacious Grid View to see your entire portfolio at a glance.
                </p>
              </div>

            </div>
          </section>
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
