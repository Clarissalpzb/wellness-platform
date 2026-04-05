import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Users, Calendar, TrendingUp, TrendingDown,
  Star, Award, AlertTriangle, Download, ChevronUp, ChevronDown,
} from "lucide-react";
import { AIWeeklyReport } from "./ai-weekly-report";

function pct(val: number, prev: number) {
  if (prev === 0) return val > 0 ? 100 : 0;
  return Math.round(((val - prev) / prev) * 100);
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-neutral-400">Sin cambio</span>;
  const positive = value > 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? "text-primary-600" : "text-accent-rose"}`}>
      {positive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(value)}% vs mes anterior
    </span>
  );
}

export default async function ReportesPage() {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId as string | undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const orgClassFilter = orgId
    ? { classSchedule: { class: { organizationId: orgId } } }
    : undefined;

  // ── Revenue ──────────────────────────────────────────────
  const [revenueThisMonth, revenueLastMonth] = orgId
    ? await Promise.all([
        db.transaction.aggregate({
          where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        db.transaction.aggregate({
          where: { organizationId: orgId, createdAt: { gte: startOfLastMonth, lt: endOfLastMonth } },
          _sum: { amount: true },
        }),
      ])
    : [{ _sum: { amount: 0 } }, { _sum: { amount: 0 } }];

  const revThis = revenueThisMonth._sum.amount ?? 0;
  const revLast = revenueLastMonth._sum.amount ?? 0;
  const revDelta = pct(revThis, revLast);

  // ── Active clients ────────────────────────────────────────
  const [clientsThisMonth, clientsLastMonth] = orgId
    ? await Promise.all([
        db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true, createdAt: { gte: startOfMonth } } }),
        db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true, createdAt: { gte: startOfLastMonth, lt: endOfLastMonth } } }),
      ])
    : [0, 0];
  const clientsDelta = pct(clientsThisMonth, clientsLastMonth);

  // ── Bookings ──────────────────────────────────────────────
  const [bookingsThis, bookingsLast] = orgId
    ? await Promise.all([
        db.booking.count({ where: { date: { gte: startOfMonth }, status: { not: "CANCELLED" }, ...orgClassFilter! } }),
        db.booking.count({ where: { date: { gte: startOfLastMonth, lt: endOfLastMonth }, status: { not: "CANCELLED" }, ...orgClassFilter! } }),
      ])
    : [0, 0];
  const bookingsDelta = pct(bookingsThis, bookingsLast);

  // ── Retention rate ─────────────────────────────────────────
  let retentionRate = 0;
  let retentionDelta = 0;
  if (orgId) {
    const totalClients = await db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true } });
    if (totalClients > 0) {
      const [activeNow, activePrev] = await Promise.all([
        db.booking.groupBy({
          by: ["userId"],
          where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter! },
          having: { userId: { _count: { gt: 1 } } },
        }),
        db.booking.groupBy({
          by: ["userId"],
          where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter! },
          having: { userId: { _count: { gt: 1 } } },
        }),
      ]);
      retentionRate = Math.round((activeNow.length / totalClients) * 100);
      const prevRate = Math.round((activePrev.length / totalClients) * 100);
      retentionDelta = retentionRate - prevRate;
    }
  }

  // ── Client lifecycle funnel ────────────────────────────────
  let totalClients = 0;
  let activeClients = 0;
  let atRiskClients = 0;
  let churnedClients = 0;
  let newThisMonth = 0;

  if (orgId) {
    totalClients = await db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true } });
    newThisMonth = clientsThisMonth;

    const recentBookers = await db.booking.groupBy({
      by: ["userId"],
      where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter! },
    });
    const recentIds = new Set(recentBookers.map((b) => b.userId));

    const atRiskBookers = await db.booking.groupBy({
      by: ["userId"],
      where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter! },
    });
    const atRiskIds = new Set(
      atRiskBookers.filter((b) => !recentIds.has(b.userId)).map((b) => b.userId)
    );

    const churnedBookers = await db.booking.groupBy({
      by: ["userId"],
      where: { date: { gte: ninetyDaysAgo, lt: sixtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter! },
    });
    const churnedIds = new Set(
      churnedBookers.filter((b) => !recentIds.has(b.userId) && !atRiskIds.has(b.userId)).map((b) => b.userId)
    );

    activeClients = recentIds.size;
    atRiskClients = atRiskIds.size;
    churnedClients = churnedIds.size;
  }

  // ── Revenue by package type ───────────────────────────────
  let revenueByPackage: { name: string; revenue: number; sales: number }[] = [];
  if (orgId) {
    const pkgs = await db.package.findMany({
      where: { organizationId: orgId },
      include: {
        userPackages: {
          where: { purchaseDate: { gte: startOfMonth } },
          include: { package: true },
        },
      },
    });
    revenueByPackage = pkgs
      .map((p) => ({
        name: p.name,
        revenue: p.userPackages.length * p.price,
        sales: p.userPackages.length,
      }))
      .filter((p) => p.sales > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }

  // ── Top & bottom classes by fill rate ─────────────────────
  interface ClassPerf {
    name: string;
    fillRate: number;
    bookings: number;
    capacity: number;
    scheduleId: string;
  }
  let classPerformance: ClassPerf[] = [];

  if (orgId) {
    const schedules = await db.classSchedule.findMany({
      where: { class: { organizationId: orgId, isActive: true }, isCancelled: false },
      include: {
        class: { select: { name: true, maxCapacity: true } },
        bookings: {
          where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } },
          select: { id: true },
        },
      },
    });

    // Group by class name, average fill rate
    const byClass = new Map<string, { total: number; capacity: number; sessions: number }>();
    for (const s of schedules) {
      const existing = byClass.get(s.class.name) ?? { total: 0, capacity: 0, sessions: 0 };
      byClass.set(s.class.name, {
        total: existing.total + s.bookings.length,
        capacity: existing.capacity + s.class.maxCapacity,
        sessions: existing.sessions + 1,
      });
    }

    for (const [name, data] of byClass) {
      if (data.capacity > 0) {
        classPerformance.push({
          name,
          fillRate: Math.round((data.total / data.capacity) * 100),
          bookings: data.total,
          capacity: data.capacity,
          scheduleId: name,
        });
      }
    }
    classPerformance.sort((a, b) => b.fillRate - a.fillRate);
  }

  const topClasses = classPerformance.slice(0, 5);
  const bottomClasses = [...classPerformance].sort((a, b) => a.fillRate - b.fillRate).slice(0, 3);

  // ── Coach performance ─────────────────────────────────────
  interface CoachPerf {
    name: string;
    classesLed: number;
    avgFillRate: number;
    avgRating: number | null;
  }
  let coachPerformance: CoachPerf[] = [];

  if (orgId) {
    const coachProfiles = await db.coachProfile.findMany({
      where: { user: { organizationId: orgId, isActive: true } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    for (const profile of coachProfiles) {
      const schedules = await db.classSchedule.findMany({
        where: { coachProfileId: profile.id, class: { organizationId: orgId }, isCancelled: false },
        include: {
          class: { select: { maxCapacity: true } },
          bookings: {
            where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } },
            select: { id: true },
          },
          reviews: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { rating: true },
          },
        },
      });

      if (schedules.length === 0) continue;

      const totalBookings = schedules.reduce((s, sc) => s + sc.bookings.length, 0);
      const totalCapacity = schedules.reduce((s, sc) => s + sc.class.maxCapacity, 0);
      const allRatings = schedules.flatMap((sc) => sc.reviews.map((r: { rating: number }) => r.rating));
      const avgRating = allRatings.length > 0
        ? Math.round((allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length) * 10) / 10
        : null;

      coachPerformance.push({
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        classesLed: schedules.length,
        avgFillRate: totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0,
        avgRating,
      });
    }
    coachPerformance.sort((a, b) => b.avgFillRate - a.avgFillRate);
  }

  const monthName = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reportes del Negocio</h1>
          <p className="text-sm text-neutral-500">Análisis completo · {monthName}</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/reports/export-csv">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Ingresos del Mes", value: `$${revThis.toLocaleString()}`, delta: revDelta, icon: DollarSign },
          { title: "Clientes Nuevos", value: String(clientsThisMonth), delta: clientsDelta, icon: Users },
          { title: "Reservas del Mes", value: String(bookingsThis), delta: bookingsDelta, icon: Calendar },
          { title: "Tasa Retención", value: `${retentionRate}%`, delta: retentionDelta, icon: TrendingUp, isPoints: true },
        ].map(({ title, value, delta, icon: Icon, isPoints }) => (
          <Card key={title}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary-600" />
                </div>
                <p className="text-xs text-neutral-500">{title}</p>
              </div>
              <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
              {isPoints ? (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${delta >= 0 ? "text-primary-600" : "text-accent-rose"}`}>
                  {delta >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {Math.abs(delta)} pts vs mes anterior
                </span>
              ) : (
                <DeltaBadge value={delta} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Weekly Report */}
      <AIWeeklyReport />

      {/* Client Lifecycle Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-blue" />
            Ciclo de Vida de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Clientes", value: totalClients, color: "text-neutral-700", bg: "bg-neutral-100" },
              { label: "Nuevos este mes", value: newThisMonth, color: "text-primary-600", bg: "bg-primary-50" },
              { label: "Activos (30d)", value: activeClients, color: "text-accent-blue", bg: "bg-accent-blue-light" },
              { label: "En riesgo (31-60d)", value: atRiskClients, color: "text-accent-amber", bg: "bg-accent-amber-light" },
              { label: "Inactivos (60d+)", value: churnedClients, color: "text-accent-rose", bg: "bg-accent-rose-light" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-4 ${bg} text-center`}>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-neutral-600 mt-1">{label}</p>
              </div>
            ))}
          </div>
          {atRiskClients > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-accent-amber-light rounded-lg">
              <AlertTriangle className="h-4 w-4 text-accent-amber shrink-0" />
              <p className="text-sm text-neutral-700">
                <strong>{atRiskClients} clientes</strong> no han reservado en 31-60 días. Activa una campaña de retención desde <a href="/crm" className="text-primary-600 underline">CRM</a>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Package + Class Performance side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Package */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary-600" />
              Ingresos por Paquete
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPackage.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">Sin ventas este mes</p>
            ) : (
              <div className="space-y-3">
                {revenueByPackage.map((pkg) => {
                  const maxRev = revenueByPackage[0].revenue;
                  const widthPct = maxRev > 0 ? Math.round((pkg.revenue / maxRev) * 100) : 0;
                  return (
                    <div key={pkg.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate max-w-[60%]">{pkg.name}</span>
                        <span className="text-neutral-500">${pkg.revenue.toLocaleString()} · {pkg.sales} ventas</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-primary-400 rounded-full" style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent-amber" />
              Clases con Mejor Ocupación (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClasses.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">Sin datos de ocupación</p>
            ) : (
              <div className="space-y-3">
                {topClasses.map((cls, i) => (
                  <div key={cls.name} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-neutral-400 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate">{cls.name}</span>
                        <span className={`font-bold ${cls.fillRate >= 80 ? "text-primary-600" : cls.fillRate >= 50 ? "text-accent-amber" : "text-accent-rose"}`}>
                          {cls.fillRate}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${cls.fillRate >= 80 ? "bg-primary-400" : cls.fillRate >= 50 ? "bg-accent-amber" : "bg-accent-rose"}`}
                          style={{ width: `${cls.fillRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Classes Alert */}
      {bottomClasses.filter((c) => c.fillRate < 50).length > 0 && (
        <Card className="border-accent-amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-amber">
              <TrendingDown className="h-5 w-5" />
              Clases con Baja Ocupación — Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bottomClasses.filter((c) => c.fillRate < 50).map((cls) => (
                <div key={cls.name} className="p-4 bg-accent-amber-light rounded-xl">
                  <p className="font-semibold text-sm truncate">{cls.name}</p>
                  <p className="text-2xl font-bold text-accent-amber">{cls.fillRate}%</p>
                  <p className="text-xs text-neutral-500">ocupación promedio</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">Promover clase</Badge>
                    <Badge variant="outline" className="text-xs">Cambiar horario</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach Performance */}
      {coachPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent-amber" />
              Rendimiento de Coaches (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="text-left py-2 font-medium text-neutral-500">Coach</th>
                    <th className="text-right py-2 font-medium text-neutral-500">Clases</th>
                    <th className="text-right py-2 font-medium text-neutral-500">Ocupación</th>
                    <th className="text-right py-2 font-medium text-neutral-500">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {coachPerformance.map((coach) => (
                    <tr key={coach.name} className="border-b border-neutral-50">
                      <td className="py-3 font-medium">{coach.name}</td>
                      <td className="py-3 text-right text-neutral-600">{coach.classesLed}</td>
                      <td className="py-3 text-right">
                        <span className={`font-semibold ${coach.avgFillRate >= 75 ? "text-primary-600" : coach.avgFillRate >= 50 ? "text-accent-amber" : "text-accent-rose"}`}>
                          {coach.avgFillRate}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {coach.avgRating ? (
                          <span className="flex items-center justify-end gap-1">
                            <Star className="h-3 w-3 fill-accent-amber text-accent-amber" />
                            {coach.avgRating}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
