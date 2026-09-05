"use client";

import React, { useState } from "react";
import { Radar, ListOrdered, ArrowLeftRight, Layers, Sparkles, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import styles from "./HowItWorks.module.css";

export default function HowItWorks() {
    const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "INR">("INR");

    return (
        <section className={styles.wrapper} aria-label="How Smart Watchlist Works">
            <div className={styles.header}>
                <div className={styles.badge}>
                    <Sparkles size={14} /> System Architecture
                </div>
                <h2 className={styles.title}>Engineered for High-Conviction Decisions</h2>
                <p className={styles.subtitle}>
                    Smart Watchlist continuously runs background edge intelligence to filter market noise, surface anomalies, and prioritize what requires your immediate focus.
                </p>
            </div>

            <div className={styles.bentoGrid}>
                {/* Card 1: Smart Attention Engine (Radar Pulse) */}
                <div className={`${styles.bentoCard} ${styles.cardHero}`}>
                    <div>
                        <div className={styles.cardMeta}>
                            <div className={styles.cardIconBox}>
                                <Radar size={22} />
                            </div>
                            <span className={styles.stepNumber}>01 // TELEMETRY</span>
                        </div>
                        <h3 className={styles.cardTitle}>Real-time Volatility & Drift Radar</h3>
                        <p className={styles.cardDescription}>
                            Background telemetry monitors your active watchlist. It flags tickers undergoing sudden price deviations (&gt;2%) or unusual volume surges relative to your previous session.
                        </p>
                    </div>

                    <div className={styles.radarWidget}>
                        <div className={styles.radarCanvas}>
                            <div className={styles.radarRing} />
                            <div className={styles.radarSweep} />
                            <div className={styles.radarCenterDot} />
                            <div className={styles.radarBlip} />
                        </div>
                        <div className={styles.radarInfo}>
                            <div className={styles.radarTag}>
                                <AlertTriangle size={12} /> ATTENTION REQUIRED
                            </div>
                            <div className={styles.radarTicker}>
                                <span>INFY.NS</span>
                                <span className={styles.radarDelta}>+3.84% Drift</span>
                            </div>
                            <div className={styles.radarSubtext}>
                                Volume: 2.3x relative spike • Triggered 4m ago
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Intelligent Priority Queue */}
                <div className={`${styles.bentoCard} ${styles.cardSide}`}>
                    <div>
                        <div className={styles.cardMeta}>
                            <div className={styles.cardIconBox}>
                                <ListOrdered size={22} />
                            </div>
                            <span className={styles.stepNumber}>02 // SORT MATRIX</span>
                        </div>
                        <h3 className={styles.cardTitle}>Dynamic Priority Reordering</h3>
                        <p className={styles.cardDescription}>
                            Zero manual sorting required. Critical attention items immediately jump to Position #1, followed by recently added securities and stable holdings.
                        </p>
                    </div>

                    <div className={styles.priorityWidget}>
                        <div className={`${styles.priorityItem} ${styles.priorityActive}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`${styles.priorityBadge} ${styles.badgeAlert}`}>#1 Focus</span>
                                <span>NVDA</span>
                            </div>
                            <span style={{ color: '#eb5b3c', fontSize: '0.78rem' }}>+5.2% Volatile</span>
                        </div>

                        <div className={styles.priorityItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`${styles.priorityBadge} ${styles.badgeNew}`}>#2 New</span>
                                <span>TATAMOTORS</span>
                            </div>
                            <span style={{ color: '#00d09c', fontSize: '0.78rem' }}>Just Added</span>
                        </div>

                        <div className={styles.priorityItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`${styles.priorityBadge} ${styles.badgeNormal}`}>#3 Track</span>
                                <span>AAPL</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>+0.3% Steady</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Dual Currency Engine (Interactive FX) */}
                <div className={`${styles.bentoCard} ${styles.cardAccent}`}>
                    <div>
                        <div className={styles.cardMeta}>
                            <div className={styles.cardIconBox}>
                                <ArrowLeftRight size={22} />
                            </div>
                            <span className={styles.stepNumber}>03 // FX ENGINE</span>
                        </div>
                        <h3 className={styles.cardTitle}>Dual-Currency Precision</h3>
                        <p className={styles.cardDescription}>
                            Track both Wall Street and Dalal Street side-by-side. Live FX conversion rates display prices, intraday swings, and valuation in both currencies.
                        </p>
                    </div>

                    <div className={styles.currencyWidget}>
                        <div className={styles.currencyToggleRow}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Interactive Preview:</span>
                            <div className={styles.currencyPills}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCurrency("INR")}
                                    className={`${styles.currencyPillBtn} ${selectedCurrency === "INR" ? styles.currencyPillBtnActive : ""}`}
                                >
                                    INR (₹)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCurrency("USD")}
                                    className={`${styles.currencyPillBtn} ${selectedCurrency === "USD" ? styles.currencyPillBtnActive : ""}`}
                                >
                                    USD ($)
                                </button>
                            </div>
                        </div>

                        <div className={styles.currencyDisplayBox}>
                            <div>
                                <div className={styles.currencyStock}>AAPL (Apple Inc.)</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Live converted rate</div>
                            </div>
                            <div className={styles.currencyValues}>
                                <div className={styles.currencyPrimaryVal}>
                                    {selectedCurrency === "INR" ? "₹19,451.20" : "$224.80"}
                                </div>
                                <div className={styles.currencySecondaryVal}>
                                    {selectedCurrency === "INR" ? "Orig: $224.80" : "Orig: ₹19,451.20"}
                                </div>
                            </div>
                        </div>

                        <div className={styles.fxRateTag}>
                            Live Exchange Rate: 1 USD = ₹86.52 INR
                        </div>
                    </div>
                </div>

                {/* Card 4: Spatial 3D & Focus Modes */}
                <div className={`${styles.bentoCard} ${styles.cardWide}`}>
                    <div>
                        <div className={styles.cardMeta}>
                            <div className={styles.cardIconBox}>
                                <Layers size={22} />
                            </div>
                            <span className={styles.stepNumber}>04 // VISION MODES</span>
                        </div>
                        <h3 className={styles.cardTitle}>Spatial 3D & Density Modes</h3>
                        <p className={styles.cardDescription}>
                            Choose how you digest market movements. Flip into interactive 3D Stack View for deep single-stock focus with swipe gestures, or Matrix Grid for complete overview.
                        </p>
                    </div>

                    <div className={styles.layoutWidget}>
                        <div style={{ textAlign: 'center' }}>
                            <div className={styles.perspectiveMiniStack}>
                                <div className={styles.miniCard3} />
                                <div className={styles.miniCard2} />
                                <div className={styles.miniCard1}>
                                    <TrendingUp size={16} color="#00d09c" />
                                    <span>3D STACK</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>
                                Single Focus
                            </div>
                        </div>

                        <div className={styles.layoutDivider} />

                        <div style={{ textAlign: 'center' }}>
                            <div className={styles.perspectiveMiniGrid}>
                                <div className={styles.gridDotCard}>01</div>
                                <div className={styles.gridDotCard}>02</div>
                                <div className={styles.gridDotCard}>03</div>
                                <div className={styles.gridDotCard}>04</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginTop: '0.5rem' }}>
                                Overview Matrix
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}