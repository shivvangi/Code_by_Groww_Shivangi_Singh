"use client";

import React from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown } from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function MarketStrip() {
    const { data: indices = [] } = useSWR("/watchlist/indices", fetcher, {
        refreshInterval: 10000, // Refresh every 10 seconds
    });

    if (!indices || indices.length === 0) return null;

    return (
        <div style={{
            width: '100%',
            overflow: 'hidden',
            background: 'var(--card-bg)',
            borderTop: '1px solid var(--card-border)',
            borderBottom: '1px solid var(--card-border)',
            padding: '0.75rem 0',
            marginBottom: '2rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        }}>
            <div style={{
                display: 'flex',
                whiteSpace: 'nowrap',
                animation: 'marquee 30s linear infinite',
                gap: '3rem',
                paddingRight: '3rem',
            }}>
                {/* Double the items to create a seamless scrolling loop */}
                {[...indices, ...indices].map((item: any, i: number) => {
                    const isPositive = item.changePercent >= 0;
                    const displayName = item.ticker === "^NSEI" ? "NIFTY 50" :
                        item.ticker === "GC=F" ? "GOLD" :
                            item.ticker === "RELIANCE.NS" ? "RELIANCE" :
                                item.ticker === "BTC-USD" ? "BITCOIN" : item.name;

                    return (
                        <div key={`${item.ticker}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>{displayName}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {item.ticker === "^NSEI" || item.ticker === "RELIANCE.NS" ? '₹' : '$'}
                                {item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: isPositive ? 'var(--success-text)' : 'var(--danger-text)',
                                background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0.25rem'
                            }}>
                                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(item.changePercent || 0).toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
        </div>
    );
}