import { Clock, Users, CheckCircle2, XCircle } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { OccupancyHeatmap } from "@/components/charts/occupancy-heatmap";
import { DayOccupancyChart } from "@/components/charts/day-occupancy-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HEATMAP_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HEATMAP_DAY_MAP: Record<string, number> = {
  Lun: 1, Mar: 2, Mié: 3, Jue: 4, Vie: 5, Sáb: 6, Dom: 0,
};

export default async function OperacionesPage() {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId as string | undefined;

  const now = new Date();
  const todayDow = now.getDay();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const orgClassFilter = orgId
    ? { classSchedule: { class: { organizationId: orgId } } }
    : undefined;

  // ---- Metric cards ----
  let classesToday = 0;
  let checkIns = 0;
  let noShows = 0;
  let waitlistCount = 0;

  if (orgId) {
    [classesToday, checkIns, noShows, waitlistCount] = await Promise.all([
      db.classSchedule.count({
        where: {
          class: { organizationId: orgId, isActive: true },
          dayOfWeek: todayDow,
          isRecurring: true,
          isCancelled: false,
        },
      }),
      db.booking.count({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
          status: "CHECKED_IN",
          ...orgClassFilter!,
        },
      }),
      db.booking.count({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
          status: "NO_SHOW",
          ...orgClassFilter!,
        },
      }),
      db.waitlistEntry.count({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
          promotedAt: null,
          expiredAt: null,
          classSchedule: { class: { organizationId: orgId } },
        },
      }),
    ]);
  }

  // ---- Today's schedule ----
  interface TodayClass {
    time: string;
    name: string;
    coach: string;
    enrolled: number;
    capacity: number;
    status: "completed" | "in_progress" | "upcoming";
  }
  let todayClasses: TodayClass[] = [];

  if (orgId) {
    const dateStart = new Date(startOfDay);
    const dateEnd = new Date(endOfDay);

    const schedules = await db.classSchedule.findMany({
      where: {
        class: { organizationId: orgId, isActive: true },
        dayOfWeek: todayDow,
        isRecurring: true,
        isCancelled: false,
      },
      include: {
        class: { select: { name: true, maxCapacity: true, duration: true } },
        coachProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        bookings: {
          where: { date: { gte: dateStart, lt: dateEnd }, status: { not: "CANCELLED" } },
          select: { id: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    todayClasses = schedules.map((s) => {
      let status: TodayClass["status"] = "upcoming";
      if (s.endTime <= currentTime) status = "completed";
      else if (s.startTime <= currentTime) status = "in_progress";

      return {
        time: s.startTime,
        name: s.class.name,
        coach: s.coachProfile
          ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
          : "",
        enrolled: s.bookings.length,
        capacity: s.class.maxCapacity,
        status,
      };
    });
  }

  // ---- Occupancy heatmap data (last 4 weeks) ----
  const heatmapData: Record<string, Record<string, number>> = {};
  const dayOccupancyData: { day: string; occupancy: number }[] = [];

  if (orgId) {
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);

    const allSchedules = await db.classSchedule.findMany({
      where: {
        class: { organizationId: orgId, isActive: true },
        isRecurring: true,
        isCancelled: false,
      },
      include: {
        class: { select: { maxCapacity: true } },
        bookings: {
          where: {
            date: { gte: fourWeeksAgo },
            status: { not: "CANCELLED" },
          },
          select: { id: true },
        },
      },
    });

    // Group by dayOfWeek + hour
    const slotData: Record<string, { totalBookings: number; totalCapacity: number; weeksWithData: number }> = {};

    for (const schedule of allSchedules) {
      const dayName = HEATMAP_DAYS[schedule.dayOfWeek === 0 ? 6 : schedule.dayOfWeek - 1];
      const hour = schedule.startTime.split(":")[0] + ":00";
      const key = `${dayName}-${hour}`;

      if (!slotData[key]) {
        slotData[key] = { totalBookings: 0, totalCapacity: 0, weeksWithData: 4 };
      }

      slotData[key].totalBookings += schedule.bookings.length;
      slotData[key].totalCapacity += schedule.class.maxCapacity * 4; // 4 weeks
    }

    // Build heatmap structure
    for (const [key, data] of Object.entries(slotData)) {
      const [day, hour] = key.split("-");
      if (!heatmapData[day]) heatmapData[day] = {};
      const pct = data.totalCapacity > 0
        ? Math.round((data.totalBookings / data.totalCapacity) * 100)
        : 0;
      heatmapData[day][hour] = pct;
    }

    // Build day occupancy (average across all hours for each day)
    for (const dayName of HEATMAP_DAYS) {
      const hours = heatmapData[dayName];
      if (!hours || Object.keys(hours).length === 0) {
        dayOccupancyData.push({ day: dayName, occupancy: 0 });
        continue;
      }
      const values = Object.values(hours);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      dayOccupancyData.push({ day: dayName, occupancy: Math.round(avg) });
    }
  }

  const statusLabels: Record<string, string> = {
    completed: "Completada",
    in_progress: "En curso",
    upcoming: "Próxima",
  };
  const statusVariant: Record<string, "secondary" | "success" | "info"> = {
    completed: "secondary",
    in_progress: "success",
    upcoming: "info",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Operaciones</h1>
        <p className="text-sm text-neutral-500">Vista operativa del día</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Clases Hoy" value={String(classesToday)} icon={Clock} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Check-ins" value={String(checkIns)} icon={CheckCircle2} />
        <MetricCard title="No-shows" value={String(noShows)} icon={XCircle} iconColor="text-accent-rose" iconBg="bg-accent-rose-light" />
        <MetricCard title="En Lista Espera" value={String(waitlistCount)} icon={Users} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Horario de Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {todayClasses.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay clases programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <span className="text-sm font-mono text-neutral-500 w-12">{cls.time}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cls.name}</p>
                    <p className="text-xs text-neutral-500">{cls.coach}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-sm font-medium ${cls.enrolled >= cls.capacity ? "text-accent-rose" : ""}`}>
                        {cls.enrolled}/{cls.capacity}
                      </span>
                      {cls.enrolled >= cls.capacity && (
                        <p className="text-xs text-accent-amber">Lista de espera</p>
                      )}
                    </div>
                    <Badge variant={statusVariant[cls.status]}>{statusLabels[cls.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyHeatmap data={heatmapData} />
        <DayOccupancyChart data={dayOccupancyData} />
      </div>
    </div>
  );
}
