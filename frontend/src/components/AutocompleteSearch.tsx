"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Search } from "lucide-react";
import styles from "../app/watchlist.module.css";

interface SearchResult {
  symbol: string;
  shortname: string;
  longname: string;
  typeDisp: string;
  exchDisp: string;
}

export default function AutocompleteSearch({ 
  onAdd, 
  isAdding 
}: { 
  onAdd: (ticker: string) => void; 
  isAdding: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/watchlist/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onAdd(symbol);
    setQuery("");
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      handleSelect(query.toUpperCase());
    }
  };

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      <form onSubmit={handleSubmit} className={styles.form} style={{ marginBottom: 0 }}>
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <Search size={20} color="var(--muted-text)" style={{ position: "absolute", left: "1rem" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search for a company or ticker (e.g. AAPL)"
            className={styles.input}
            style={{ paddingLeft: "3rem" }}
            disabled={isAdding}
            autoComplete="off"
          />
        </div>
        <button type="submit" disabled={!query || isAdding} className={styles.button}>
          {isAdding ? "Adding..." : "Add"}
        </button>
      </form>

      {showDropdown && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((r, i) => (
            <div 
              key={`${r.symbol}-${i}`} 
              className={styles.dropdownItem}
              onClick={() => handleSelect(r.symbol)}
            >
              <div className={styles.dropdownSymbol}>{r.symbol}</div>
              <div className={styles.dropdownName}>{r.longname || r.shortname}</div>
              <div className={styles.dropdownExchange}>{r.exchDisp}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
