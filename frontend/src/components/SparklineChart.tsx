"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineData {
  date: string;
  price: number;
}

export default function SparklineChart({ data, color }: { data: SparklineData[]; color: string }) {
  if (!data || data.length === 0) return null;

  // Calculate min and max for the YAxis domain to make the line fill the space better
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Add a little padding to the domain
  const padding = (max - min) * 0.1;

  return (
    <div style={{ height: "60px", width: "100%", marginTop: "1rem" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
