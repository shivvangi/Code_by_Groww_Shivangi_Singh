"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  userId: string | null;
}

const UserContext = createContext<UserContextType>({ userId: null });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let storedId = localStorage.getItem("watchlist_guest_id");
      
      if (!storedId) {
        storedId = `guest_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("watchlist_guest_id", storedId);
      }
      
      setUserId(storedId);
    } catch (e) {
      console.error("localStorage error:", e);
      setUserId("guest_fallback");
    }
  }, []);

  return (
    <UserContext.Provider value={{ userId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
