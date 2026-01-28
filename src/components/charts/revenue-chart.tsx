"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { month: "Ago", current: 85000, previous: 72000 },
  { month: "Sep", current: 92000, previous: 78000 },
  { month: "Oct", current: 88000, previous: 85000 },
  { month: "Nov", current: 105000, previous: 90000 },
  { month: "Dic", current: 78000, previous: 95000 },
  { month: "Ene", current: 115000, previous: 82000 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString()} MXN`, ""]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Legend />
            <Bar dataKey="current" name="Este período" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="previous" name="Período anterior" fill="#d1d5db" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
