import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const dayOfWeekStr = searchParams.get("dayOfWeek");
  const startTime = searchParams.get("startTime");
  const duration = parseInt(searchParams.get("duration") || "60", 10);

  if (!classId || dayOfWeekStr === null || !startTime) {
    return badRequest("classId, dayOfWeek y startTime son requeridos");
  }

  const dayOfWeek = parseInt(dayOfWeekStr, 10);
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration;

  const [compensations, coachProfiles, existingSchedules] = await Promise.all([
    db.coachCompensation.findMany({
      where: {
        coachProfile: { user: { organizationId: orgId } },
        effectiveTo: null,
        OR: [{ classId }, { classId: null }],
      },
      select: { coachProfileId: true },
    }),
    db.coachProfile.findMany({
      where: { user: { organizationId: orgId } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        availability: { where: { isActive: true } },
      },
    }),
    db.classSchedule.findMany({
      where: {
        class: { organizationId: orgId },
        isRecurring: true,
        isCancelled: false,
        dayOfWeek,
      },
      select: {
        coachProfileId: true,
        startTime: true,
        endTime: true,
      },
    }),
  ]);

  const eligibleCoachIds = new Set(compensations.map((c) => c.coachProfileId));

  const available: { coachProfileId: string; name: string }[] = [];

  for (const cp of coachProfiles) {
    if (!eligibleCoachIds.has(cp.id)) continue;

    // Check availability covers this time slot
    const hasAvailability = cp.availability.some(
      (a) =>
        a.dayOfWeek === dayOfWeek &&
        timeToMinutes(a.startTime) <= startMin &&
        timeToMinutes(a.endTime) >= endMin
    );
    if (!hasAvailability) continue;

    // Check no schedule conflict
    const hasConflict = existingSchedules.some(
      (s) =>
        s.coachProfileId === cp.id &&
        overlaps(startMin, endMin, timeToMinutes(s.startTime), timeToMinutes(s.endTime))
    );
    if (hasConflict) continue;

    available.push({
      coachProfileId: cp.id,
      name: `${cp.user.firstName} ${cp.user.lastName}`,
    });
  }

  return success(available);
}
