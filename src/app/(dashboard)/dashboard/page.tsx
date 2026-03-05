import { DollarSign, Users, Calendar, TrendingUp, Clock, Target } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { BookingsPieChart } from "@/components/charts/bookings-pie-chart";
import { BirthdayBanner } from "@/components/birthday-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { InviteLinkCard } from "./invite-link-card";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SOURCE_LABELS: Record<string, string> = {
  app: "App",
  admin: "Admin",
  fitpass: "Fitpass",
};

export default async function DashboardPage() {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;
  const userRole = (session?.user as any)?.role;
  const showFinancials = userRole !== "HEAD_COACH";

  let orgSlug: string | null = null;
  let monthlyOperatingCost = 0;
  if (orgId) {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { slug: true, monthlyOperatingCost: true },
    });
    orgSlug = org?.slug ?? null;
    monthlyOperatingCost = org?.monthlyOperatingCost ?? 0;
  }

  // ---- Date ranges ----
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Org class filter (reused across queries)
  const orgClassFilter = { classSchedule: { class: { organizationId: orgId } } };

  // ---- Reservas Hoy ----
  const bookingsToday = orgId
    ? await db.booking.count({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
          status: { not: "CANCELLED" },
          ...orgClassFilter,
        },
      })
    : 0;

  // ---- Clientes Activos ----
  // Count clients directly in org + clients who have booked classes in this org
  let activeClients = 0;
  if (orgId) {
    const directClients = await db.user.count({
      where: { organizationId: orgId, role: "CLIENT", isActive: true },
    });

    // Clients who booked classes in this org but aren't directly assigned
    const bookingClients = await db.booking.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...orgClassFilter,
        user: {
          OR: [
            { organizationId: { not: orgId } },
            { organizationId: null },
          ],
          role: "CLIENT",
          isActive: true,
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    activeClients = directClients + bookingClients.length;
  }

  // ---- Ingresos del Mes ----
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

  // ---- Tasa Retención ----
  let retentionRate = 0;
  if (orgId && activeClients > 0) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const returningClients = await db.booking.groupBy({
      by: ["userId"],
      where: {
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
        ...orgClassFilter,
      },
      having: { userId: { _count: { gt: 1 } } },
    });
    retentionRate = Math.round((returningClients.length / activeClients) * 100);
  }

  // ---- Revenue Chart (last 6 months) ----
  const revenueData: { month: string; current: number; previous: number }[] = [];
  if (orgId) {
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const prevYearStart = new Date(monthDate.getFullYear() - 1, monthDate.getMonth(), 1);
      const prevYearEnd = new Date(monthDate.getFullYear() - 1, monthDate.getMonth() + 1, 1);

      const [current, previous] = await Promise.all([
        db.transaction.aggregate({
          where: { organizationId: orgId, createdAt: { gte: monthDate, lt: monthEnd } },
          _sum: { amount: true },
        }),
        db.transaction.aggregate({
          where: { organizationId: orgId, createdAt: { gte: prevYearStart, lt: prevYearEnd } },
          _sum: { amount: true },
        }),
      ]);

      revenueData.push({
        month: MONTH_NAMES[monthDate.getMonth()],
        current: current._sum.amount ?? 0,
        previous: previous._sum.amount ?? 0,
      });
    }
  }

  // ---- Reservas por Fuente (this month) ----
  let bookingsBySource: { name: string; value: number }[] = [];
  if (orgId) {
    const sourceGroups = await db.booking.groupBy({
      by: ["source"],
      where: {
        date: { gte: startOfMonth },
        status: { not: "CANCELLED" },
        ...orgClassFilter,
      },
      _count: true,
    });
    bookingsBySource = sourceGroups.map((g) => ({
      name: SOURCE_LABELS[g.source] || g.source,
      value: g._count,
    }));
  }

  // ---- Reservas del Mes ----
  const bookingsMonth = orgId
    ? await db.booking.count({
        where: {
          date: { gte: startOfMonth },
          status: { not: "CANCELLED" },
          ...orgClassFilter,
        },
      })
    : 0;

  // ---- Nuevos Clientes ----
  const newCustomers = orgId
    ? await db.user.findMany({
        where: {
          role: "CLIENT",
          isActive: true,
          createdAt: { gte: startOfMonth },
          OR: [
            { organizationId: orgId },
            {
              bookings: {
                some: { ...orgClassFilter },
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { firstName: true, lastName: true, createdAt: true },
      })
    : [];

  // ---- Spots Left (upcoming today) ----
  interface UpcomingSlot {
    name: string;
    time: string;
    enrolled: number;
    capacity: number;
    spotsLeft: number;
  }
  let upcomingSlots: UpcomingSlot[] = [];

  if (orgId) {
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayDow = now.getDay();

    const upcoming = await db.classSchedule.findMany({
      where: {
        class: { organizationId: orgId, isActive: true },
        dayOfWeek: todayDow,
        isRecurring: true,
        isCancelled: false,
        startTime: { gte: currentTime },
      },
      include: {
        class: { select: { name: true, maxCapacity: true } },
        bookings: {
          where: {
            date: { gte: startOfDay, lt: endOfDay },
            status: { not: "CANCELLED" },
          },
          select: { id: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 6,
    });

    upcomingSlots = upcoming.map((s) => ({
      name: s.class.name,
      time: s.startTime,
      enrolled: s.bookings.length,
      capacity: s.class.maxCapacity,
      spotsLeft: Math.max(0, s.class.maxCapacity - s.bookings.length),
    }));
  }

  // ---- Break-even metrics ----
  let avgRevenuePerClass = 0;
  let breakEvenClasses = 0;

  if (orgId && showFinancials && monthlyOperatingCost > 0 && monthlyRevenue > 0) {
    const classesHeldRaw = await db.booking.groupBy({
      by: ["classScheduleId", "date"],
      where: {
        date: { gte: startOfMonth },
        status: { not: "CANCELLED" },
        ...orgClassFilter,
      },
    });
    const classesHeld = classesHeldRaw.length;
    if (classesHeld > 0) {
      avgRevenuePerClass = Math.round(monthlyRevenue / classesHeld);
      breakEvenClasses = Math.ceil(monthlyOperatingCost / avgRevenuePerClass);
    }
  }

  // ---- Birthday banner ----
  let birthdayNames: { firstName: string; lastName: string }[] = [];
  if (orgId) {
    const month = now.getMonth() + 1;
    const day = now.getDate();
    birthdayNames = await db.$queryRaw<{ firstName: string; lastName: string }[]>(
      Prisma.sql`SELECT "firstName", "lastName" FROM "User" WHERE "organizationId" = ${orgId} AND "role" = 'CLIENT' AND "isActive" = true AND "dateOfBirth" IS NOT NULL AND EXTRACT(MONTH FROM "dateOfBirth") = ${month} AND EXTRACT(DAY FROM "dateOfBirth") = ${day}`
    );
  }

  // Only show revenue chart if there's data
  const hasRevenueData = revenueData.some((d) => d.current > 0 || d.previous > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Resumen general de tu centro</p>
      </div>

      {birthdayNames.length > 0 && <BirthdayBanner names={birthdayNames} />}

      {orgSlug && <InviteLinkCard slug={orgSlug} />}

      {/* Metrics */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showFinancials ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
        {showFinancials && (
          <MetricCard
            title="Ingresos del Mes"
            value={`$${monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
          />
        )}
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

      {/* Break-even metrics */}
      {showFinancials && monthlyOperatingCost > 0 && avgRevenuePerClass > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="Ingreso Promedio/Clase"
            value={`$${avgRevenuePerClass.toLocaleString()}`}
            icon={DollarSign}
            iconColor="text-accent-blue"
            iconBg="bg-accent-blue-light"
          />
          <MetricCard
            title="Punto de Equilibrio"
            value={`${breakEvenClasses} clases`}
            icon={Target}
            iconColor="text-accent-amber"
            iconBg="bg-accent-amber-light"
          />
        </div>
      )}

      {/* Charts */}
      <div className={`grid grid-cols-1 ${showFinancials ? "lg:grid-cols-3" : ""} gap-6`}>
        {showFinancials && (
          <div className="lg:col-span-2">
            <RevenueChart data={hasRevenueData ? revenueData : []} />
          </div>
        )}
        <BookingsPieChart data={bookingsBySource} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Lugares Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lugares Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSlots.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay clases próximas hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSlots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{slot.name}</p>
                      <p className="text-xs text-neutral-500">{slot.time}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${slot.spotsLeft === 0 ? "text-accent-rose" : slot.spotsLeft <= 3 ? "text-accent-amber" : "text-primary-600"}`}>
                        {slot.spotsLeft === 0 ? "Lleno" : `${slot.spotsLeft} lugares`}
                      </span>
                      <p className="text-xs text-neutral-400">{slot.enrolled}/{slot.capacity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
