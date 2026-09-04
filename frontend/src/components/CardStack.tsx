"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, TrendingUp, TrendingDown, Clock, ChevronRight, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import styles from "../app/watchlist.module.css";
import SparklineChart from "./SparklineChart";

interface CardStackProps {
  items: any[];
  onRemove: (ticker: string, e: React.MouseEvent) => void;
  exchangeRate: number;
  viewMode?: 'stack' | 'grid';
}

export default function CardStack({ items, onRemove, exchangeRate, viewMode = 'stack' }: CardStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  // Ensure activeIndex is always within bounds
  const safeActiveIndex = Math.min(activeIndex, items.length - 1);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
    setExpandedCards({});
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    setExpandedCards({});
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only register horizontal swipe if it's more horizontal than vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) handleNext(); // swipe left → next card
      else handlePrev();         // swipe right → prev card
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const formatPrice = (price: number, currency: string = "USD") => {
    const base = new Intl.NumberFormat("en-US", { style: "currency", currency: currency }).format(price);
    
    if (currency === "USD") {
      const inr = new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(price * exchangeRate);
      return `${base} (${inr})`;
    } else if (currency === "INR") {
      const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / exchangeRate);
      return `${base} (${usd})`;
    }
    
    return base;
  };
  
  const formatLargeNum = (num: number, currency: string = "USD") => {
    if (!num) return "N/A";
    
    const formatSuffix = (n: number) => {
      if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
      if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      return n.toLocaleString();
    };

    const getSymbol = (curr: string) => 
      new Intl.NumberFormat("en-US", { style: "currency", currency: curr, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find(p => p.type === 'currency')?.value || "$";

    const base = getSymbol(currency) + formatSuffix(num);
    
    if (currency === "USD") {
      const inr = getSymbol("INR") + formatSuffix(num * exchangeRate);
      return `${base} (${inr})`;
    } else if (currency === "INR") {
      const usd = getSymbol("USD") + formatSuffix(num / exchangeRate);
      return `${base} (${usd})`;
    }
    
    return base;
  };

  const renderCardContent = (item: any, isFront: boolean) => {
    const current = item.current || {};
    
    let sparklineColor = "#3b82f6";
    if (item.sparklineData && item.sparklineData.length > 1) {
      const firstPrice = item.sparklineData[0].price;
      const lastPrice = item.sparklineData[item.sparklineData.length - 1].price;
      sparklineColor = lastPrice >= firstPrice ? "#10b981" : "#ef4444";
    }

    const isCardExpanded = expandedCards[item.ticker] || false;

    return (
      <div 
        className={`${styles.card} ${isFront ? styles.front : ''} ${isCardExpanded ? styles.expanded : ''}`}
        onClick={() => isFront && viewMode === 'stack' ? setExpandedCards(prev => ({ ...prev, [item.ticker]: !prev[item.ticker] })) : null}
        style={{ 
          cursor: isFront && viewMode === 'stack' ? 'pointer' : 'default', 
          width: '100%', 
          margin: 0, 
          height: isCardExpanded && isFront ? 'auto' : '100%', 
          minHeight: '260px',
          position: viewMode === 'grid' && isCardExpanded ? 'absolute' : 'relative',
          zIndex: viewMode === 'grid' && isCardExpanded ? 100 : 1
        }}
      >
        <div className={styles.cardHeader}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.ticker}>{item.ticker}</span>
            {current.longName && (
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {current.longName}
              </span>
            )}
          </div>
          {isFront && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setExpandedCards(prev => ({ ...prev, [item.ticker]: !prev[item.ticker] })); }} 
                className={styles.removeButton} 
                aria-label="Expand"
                title="Toggle Extended View"
              >
                {isCardExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onRemove(item.ticker, e); }} className={styles.removeButton} aria-label="Remove">
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.priceRow}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            {(() => {
              const formatted = current.price ? formatPrice(current.price, current.currency) : "N/A";
              if (formatted.includes('(')) {
                const parts = formatted.split(' (');
                return (
                  <>
                    <span className={styles.price}>{parts[0]}</span>
                    <span className={styles.price} style={{ fontSize: '1.25rem', color: 'var(--muted-text)', marginTop: '-0.25rem' }}>
                      ({parts[1]}
                    </span>
                  </>
                );
              }
              return <span className={styles.price}>{formatted}</span>;
            })()}
          </div>
          {current.changePercent !== undefined && (
            <span className={`${styles.change} ${current.changePercent >= 0 ? styles.positive : styles.negative}`}>
              {current.changePercent >= 0 ? <TrendingUp size={16} style={{display:'inline', verticalAlign:'sub'}} /> : <TrendingDown size={16} style={{display:'inline', verticalAlign:'sub'}} />}
              {Math.abs(current.changePercent).toFixed(2)}%
            </span>
          )}
        </div>

        {item.sparklineData && (!isCardExpanded || !isFront) && (
          <SparklineChart data={item.sparklineData} color={sparklineColor} />
        )}

        <AnimatePresence>
          {isCardExpanded && isFront && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.detailedStats}
            >
              <div className={styles.statGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Market Cap</span>
                  <span className={styles.statValue}>{formatLargeNum(current.marketCap, current.currency)}</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>P/E Ratio</span>
                  <span className={styles.statValue}>{current.trailingPE ? current.trailingPE.toFixed(2) : "N/A"}</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>52W High</span>
                  <span className={styles.statValue}>{current.fiftyTwoWeekHigh ? formatPrice(current.fiftyTwoWeekHigh, current.currency) : "N/A"}</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>52W Low</span>
                  <span className={styles.statValue}>{current.fiftyTwoWeekLow ? formatPrice(current.fiftyTwoWeekLow, current.currency) : "N/A"}</span>
                </div>
              </div>
              {item.sparklineData && (
                <div style={{ marginTop: '1rem' }}>
                  <span className={styles.statLabel} style={{ marginBottom: '0.5rem', display: 'block' }}>7-Day Trend</span>
                  <SparklineChart data={item.sparklineData} color={sparklineColor} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {item.meaningful && !isCardExpanded && (
          <div className={styles.meaningfulBox} style={{ marginTop: '1rem' }}>
            <div className={styles.meaningfulTitle}>
              <AlertTriangle size={16} /> Needs Attention
            </div>
            <ul className={styles.reasonList}>
              {item.reasons?.map((reason: string, i: number) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {item.lastViewedPrice && !item.meaningful && !isCardExpanded && (
          <div style={{ fontSize: "0.8rem", color: "#666", display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: 'auto', paddingTop: '1rem' }}>
            <Clock size={12} /> Last viewed at {formatPrice(item.lastViewedPrice, current.currency)}
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'grid') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '1.5rem', width: '100%', alignItems: 'start' }}>
        {items.map((item) => (
          <div key={item.ticker} style={{ position: 'relative', width: '100%', height: '100%', minHeight: '260px' }}>
            {renderCardContent(item, true)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto', perspective: 1000 }}>
      {/* Desktop Navigation Controls – hidden on mobile via CSS */}
      {items.length > 1 && (
        <div className={styles.stackNavDesktop}>
          <button onClick={handlePrev} className={styles.stackNavButton}>
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleNext} className={styles.stackNavButton}>
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {/* Stack container – swipeable on mobile */}
      <div
        style={{ position: "relative", height: '420px', display: 'flex', justifyContent: 'center' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence>
          {items.map((item, index) => {
            let diff = index - safeActiveIndex;
            if (diff < 0) diff += items.length;
            
            // Render up to 5 cards deep
            if (diff > 4 && diff !== items.length - 1) return null;

            const isFront = diff === 0;
            const zIndex = 30 - diff;
            const scale = 1 - diff * 0.04;
            const yOffset = diff * 12;
            
            // Symmetrical alternating spread
            let xOffset = 0;
            let rotate = 0;
            if (!isFront) {
               const baseOffset = diff > 2 ? 65 : 35;
               const baseRotate = diff > 2 ? 6 : 3;
               xOffset = diff % 2 === 1 ? -baseOffset : baseOffset;
               rotate = diff % 2 === 1 ? -baseRotate : baseRotate;
            }

            if (diff === items.length - 1 && items.length > 2) return null;

            const isCardExpanded = expandedCards[item.ticker] || false;
            return (
              <motion.div
                key={item.ticker}
                initial={{ opacity: 0, scale: 0.8, y: 50, x: 0, rotate: 0 }}
                animate={{ 
                  opacity: 1 - diff * 0.25,
                  scale: scale,
                  y: yOffset,
                  x: xOffset,
                  rotate: rotate,
                  zIndex: zIndex
                }}
                exit={{ opacity: 0, scale: 0.8, y: -50, x: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                  position: isFront && isCardExpanded ? "relative" : "absolute",
                  width: "100%",
                  pointerEvents: isFront ? "auto" : "none"
                }}
                layout
              >
                {renderCardContent(item, isFront)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div style={{ textAlign: "center", marginTop: expandedCards[items[safeActiveIndex]?.ticker] ? "1rem" : "2rem", color: "var(--muted-text)", fontSize: "0.85rem" }}>
        {safeActiveIndex + 1} of {items.length} Tracked Stocks
        {items.length > 1 && (
          <div className={styles.swipeHint}>
            ← Swipe to browse →
          </div>
        )}
      </div>
    </div>
  );
}
