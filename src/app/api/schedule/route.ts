import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const dayOfWeekParam = searchParams.get("dayOfWeek");

  let dayOfWeek: number;
  let targetDate: Date;

  if (dateParam) {
    targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      return badRequest("Fecha inválida");
    }
    dayOfWeek = targetDate.getDay();
  } else if (dayOfWeekParam !== null) {
    dayOfWeek = parseInt(dayOfWeekParam, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return badRequest("dayOfWeek debe ser un número entre 0 y 6");
    }
    targetDate = new Date();
  } else {
    targetDate = new Date();
    dayOfWeek = targetDate.getDay();
  }

  const dateStart = new Date(targetDate.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: orgId, isActive: true },
      dayOfWeek,
      isRecurring: true,
      isCancelled: false,
    },
    include: {
      class: {
        select: {
          name: true,
          color: true,
          duration: true,
          maxCapacity: true,
          category: true,
          level: true,
        },
      },
      location: { select: { name: true } },
      space: { select: { name: true } },
      coachProfile: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      bookings: {
        where: {
          date: { gte: dateStart, lt: dateEnd },
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const result = schedules.map((s) => ({
    id: s.id,
    time: s.startTime,
    endTime: s.endTime,
    name: s.class.name,
    color: s.class.color,
    duration: s.class.duration,
    capacity: s.class.maxCapacity,
    category: s.class.category,
    level: s.class.level,
    location: s.location?.name ?? "",
    space: s.space?.name ?? "",
    coach: s.coachProfile
      ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
      : "",
    enrolled: s.bookings.length,
    available: s.class.maxCapacity - s.bookings.length,
  }));

  return success(result);
}
