"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Star, Users, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CoachPerf {
  id: string;
  name: string;
  avatar: string | null;
  totalClasses: number;
  uniqueClients: number;
  avgFillRate: number;
  avgRating: number | null;
  reviewCount: number;
  monthlyTrend: { month: string; classes: number; avgFill: number }[];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function FillBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-neutral-700 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function RendimientoPage() {
  const [coaches, setCoaches] = useState<CoachPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/performance?months=3")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCoaches(data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Rendimiento del Equipo</h1>
        <p className="text-sm text-neutral-500">Últimos 3 meses — fill rate, clientes únicos y calificaciones</p>
      </div>

      {coaches.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <BarChart3 className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p>No hay datos de coaches disponibles</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coaches.map((coach, idx) => (
            <Card key={coach.id} className="overflow-hidden">
              <CardContent className="py-4">
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === coach.id ? null : coach.id)}
                >
                  {/* Rank */}
                  <span className="text-lg font-bold text-neutral-300 w-6 text-center">{idx + 1}</span>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={coach.avatar ?? undefined} />
                    <AvatarFallback>{initials(coach.name)}</AvatarFallback>
                  </Avatar>

                  {/* Name + metrics */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm">{coach.name}</p>
                    <div className="mt-1">
                      <FillBar pct={coach.avgFillRate} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-bold text-neutral-900">{coach.totalClasses}</p>
                      <p className="text-xs text-neutral-400">Clases</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-neutral-900">{coach.uniqueClients}</p>
                      <p className="text-xs text-neutral-400">Clientes</p>
                    </div>
                    {coach.avgRating !== null && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold text-neutral-900">{coach.avgRating}</span>
                        <span className="text-xs text-neutral-400">({coach.reviewCount})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded monthly trend */}
                {expanded === coach.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <p className="text-xs font-medium text-neutral-500 mb-3 uppercase tracking-wide">Fill rate mensual</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={coach.monthlyTrend} barSize={24}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip
                          formatter={(v: unknown) => [`${v}%`, "Fill rate"]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="avgFill" radius={[4, 4, 0, 0]}>
                          {coach.monthlyTrend.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.avgFill >= 70 ? "#22c55e" : entry.avgFill >= 40 ? "#f59e0b" : "#f87171"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-3 gap-3 mt-3 sm:hidden">
                      <div className="text-center">
                        <p className="font-bold text-neutral-900">{coach.totalClasses}</p>
                        <p className="text-xs text-neutral-400">Clases</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-neutral-900">{coach.uniqueClients}</p>
                        <p className="text-xs text-neutral-400">Clientes</p>
                      </div>
                      {coach.avgRating !== null && (
                        <div className="text-center">
                          <p className="font-bold text-neutral-900 flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            {coach.avgRating}
                          </p>
                          <p className="text-xs text-neutral-400">{coach.reviewCount} reseñas</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
