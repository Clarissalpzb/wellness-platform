import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string | null;
  if (!orgId) return success({});

  const { searchParams } = new URL(req.url);
  const weekStartParam = searchParams.get("weekStart");

  let weekStart: Date;
  if (weekStartParam) {
    weekStart = new Date(weekStartParam);
    if (isNaN(weekStart.getTime())) return badRequest("Fecha inválida");
  } else {
    // Default to current week's Monday
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day;
    weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  }

  // Compute the 7-day range (Mon-Sun)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: orgId, isActive: true },
      isCancelled: false,
      OR: [
        { isRecurring: true },
        {
          specificDate: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      ],
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
    },
    orderBy: { startTime: "asc" },
  });

  // Group by dayOfWeek (0-6)
  const result: Record<number, any[]> = {};
  for (let d = 0; d <= 6; d++) result[d] = [];

  for (const s of schedules) {
    const item = {
      id: s.id,
      classId: s.classId,
      startTime: s.startTime,
      endTime: s.endTime,
      className: s.class.name,
      classColor: s.class.color,
      duration: s.class.duration,
      capacity: s.class.maxCapacity,
      category: s.class.category,
      level: s.class.level,
      locationId: s.locationId,
      location: s.location?.name ?? "",
      spaceId: s.spaceId,
      space: s.space?.name ?? "",
      coach: s.coachProfile
        ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
        : "",
      coachProfileId: s.coachProfileId,
    };

    if (s.isRecurring) {
      result[s.dayOfWeek].push(item);
    } else if (s.specificDate) {
      const dow = s.specificDate.getDay();
      result[dow].push(item);
    }
  }

  return success(result);
}
