import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { BookingsPieChart } from "@/components/charts/bookings-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InviteLinkCard } from "./invite-link-card";

export default async function DashboardPage() {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;

  let orgSlug: string | null = null;
  if (orgId) {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });
    orgSlug = org?.slug ?? null;
  }

  // ---- Queries ----
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Reservas Hoy – bookings for today scoped to org's classes
  const bookingsToday = orgId
    ? await db.booking.count({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
          status: { not: "CANCELLED" },
          classSchedule: { class: { organizationId: orgId } },
        },
      })
    : 0;

  // Clientes Activos – users with CLIENT role belonging to this org
  const activeClients = orgId
    ? await db.user.count({
        where: {
          organizationId: orgId,
          role: "CLIENT",
          isActive: true,
        },
      })
    : 0;

  // Ingresos del Mes – sum of transactions this month
  let monthlyRevenue = 0;
  if (orgId) {
    const result = await db.transaction.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });
    monthlyRevenue = result._sum.amount ?? 0;
  }

  // Tasa Retención – clients with >1 booking in the last 30 days / total active clients
  let retentionRate = 0;
  if (orgId && activeClients > 0) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const returningClients = await db.booking.groupBy({
      by: ["userId"],
      where: {
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
        classSchedule: { class: { organizationId: orgId } },
      },
      having: { userId: { _count: { gt: 1 } } },
    });
    retentionRate = Math.round((returningClients.length / activeClients) * 100);
  }

  // Nuevos Clientes – last 5 clients who joined this month
  const newCustomers = orgId
    ? await db.user.findMany({
        where: {
          organizationId: orgId,
          role: "CLIENT",
          createdAt: { gte: startOfMonth },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { firstName: true, lastName: true, createdAt: true },
      })
    : [];

  // Reservas del Mes – total this month for subtitle
  const bookingsMonth = orgId
    ? await db.booking.count({
        where: {
          date: { gte: startOfMonth },
          status: { not: "CANCELLED" },
          classSchedule: { class: { organizationId: orgId } },
        },
      })
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Resumen general de tu centro</p>
      </div>

      {orgSlug && <InviteLinkCard slug={orgSlug} />}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos del Mes"
          value={`$${monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Clientes Activos"
          value={String(activeClients)}
          icon={Users}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue-light"
        />
        <MetricCard
          title="Reservas Hoy"
          value={String(bookingsToday)}
          icon={Calendar}
          iconColor="text-accent-amber"
          iconBg="bg-accent-amber-light"
        />
        <MetricCard
          title="Tasa Retención"
          value={`${retentionRate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <BookingsPieChart />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reservas del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsMonth === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay reservas este mes</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl font-bold text-neutral-900">{bookingsMonth}</p>
                <p className="text-sm text-neutral-500 mt-1">reservas en {now.toLocaleDateString("es-MX", { month: "long" })}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {newCustomers.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay clientes nuevos este mes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {newCustomers.map((customer) => (
                  <div key={customer.firstName + customer.createdAt.toISOString()} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-neutral-500">
                        {customer.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge variant="outline">Nuevo</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
