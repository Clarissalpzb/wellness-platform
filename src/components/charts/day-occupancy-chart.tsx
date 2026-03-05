"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayOccupancyData {
  day: string;
  occupancy: number;
}

export function DayOccupancyChart({ data = [] }: { data?: DayOccupancyData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupación por Día</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-neutral-500" style={{ minHeight: 300 }}>
            <p>No hay datos disponibles</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)}%`, "Ocupación"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="occupancy" name="Ocupación" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
