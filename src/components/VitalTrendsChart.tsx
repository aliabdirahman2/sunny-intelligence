"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VITALS, VITAL_COLORS, type Vital } from "@/lib/domain";

export interface VitalChartPoint {
  weekIndex: number;
  label?: string;
  Supported: number | null;
  Energized: number | null;
  Aligned: number | null;
  Recognized: number | null;
  Safe: number | null;
}

export function VitalTrendsChart(props: {
  data: VitalChartPoint[];
  height?: number;
  projectStartWeek?: number;
  interventionWeek?: number;
  highlightVitals?: Vital[];
}) {
  const { data, height = 290, projectStartWeek, interventionWeek, highlightVitals } = props;
  const formatted = data.map((d) => ({
    ...d,
    name: d.label || `Wk ${d.weekIndex}`,
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 10, right: 18, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d6" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5a625d" }} />
          <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#5a625d" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              borderColor: "#dfd9cc",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {projectStartWeek && (
            <ReferenceLine
              x={`Wk ${projectStartWeek}`}
              stroke="#b87b20"
              strokeDasharray="4 4"
              label={{ value: "Outreach Project Launch (Wk 6)", position: "top", fill: "#935f12", fontSize: 10 }}
            />
          )}
          {interventionWeek && (
            <ReferenceLine
              x={`Wk ${interventionWeek}`}
              stroke="#3d6b52"
              strokeDasharray="4 4"
              label={{ value: "Workshop Completed (Wk 12)", position: "insideTopRight", fill: "#2f5741", fontSize: 10 }}
            />
          )}
          {VITALS.map((v) => {
            const emphasized = !highlightVitals || highlightVitals.includes(v);
            return (
              <Line
                key={v}
                type="monotone"
                dataKey={v}
                stroke={VITAL_COLORS[v]}
                strokeWidth={emphasized ? 2.5 : 1.5}
                strokeOpacity={emphasized ? 1 : 0.45}
                dot={{ r: emphasized ? 3 : 2 }}
                connectNulls={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
