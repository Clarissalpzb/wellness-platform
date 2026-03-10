import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

interface BulkAssignment {
  dayOfWeek: number;
  coachProfileId: string | null;
  coachName: string | null;
  spaceId: string | null;
  spaceName: string | null;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  const body = await req.json();
  const { classId, days, startTime, locationId } = body;

  if (!classId || !days || !Array.isArray(days) || days.length === 0 || !startTime || !locationId) {
    return badRequest("classId, days, startTime y locationId son requeridos");
  }

  // Validate class belongs to org and get duration
  const cls = await db.class.findFirst({
    where: { id: classId, organizationId: orgId, isActive: true },
    select: { id: true, name: true, duration: true },
  });
  if (!cls) return badRequest("Clase no encontrada");

  // Validate location belongs to org
  const location = await db.location.findFirst({
    where: { id: locationId, organizationId: orgId },
  });
  if (!location) return badRequest("Ubicación no encontrada");

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + cls.duration;
  const endTime = minutesToTime(endMin);

  // Fetch data in parallel
  const [compensations, coachProfiles, existingSchedules, spaces] = await Promise.all([
    // Coach compensation rules for this class (specific + global)
    db.coachCompensation.findMany({
      where: {
        coachProfile: { user: { organizationId: orgId } },
        effectiveTo: null,
        OR: [{ classId }, { classId: null }],
      },
      select: { coachProfileId: true, classId: true },
    }),
    // Coach profiles with availability
    db.coachProfile.findMany({
      where: { user: { organizationId: orgId } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        availability: { where: { isActive: true } },
      },
    }),
    // Existing recurring schedules (for conflict detection)
    db.classSchedule.findMany({
      where: {
        class: { organizationId: orgId },
        isRecurring: true,
        isCancelled: false,
      },
      select: {
        coachProfileId: true,
        spaceId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    }),
    // Spaces at this location
    db.space.findMany({
      where: { locationId },
      select: { id: true, name: true, capacity: true },
    }),
  ]);

  // Build set of eligible coach profile IDs
  const eligibleCoachIds = new Set(compensations.map((c) => c.coachProfileId));

  // Build coach info map
  const coachInfoMap = new Map(
    coachProfiles.map((cp) => [
      cp.id,
      {
        name: `${cp.user.firstName} ${cp.user.lastName}`,
        availability: cp.availability,
      },
    ])
  );

  // Count how many classes each coach has per day (for load balancing)
  const coachDayLoad = new Map<string, Map<number, number>>();
  for (const s of existingSchedules) {
    if (s.coachProfileId) {
      if (!coachDayLoad.has(s.coachProfileId)) {
        coachDayLoad.set(s.coachProfileId, new Map());
      }
      const dayMap = coachDayLoad.get(s.coachProfileId)!;
      dayMap.set(s.dayOfWeek, (dayMap.get(s.dayOfWeek) ?? 0) + 1);
    }
  }

  // Find first available space at this time for each day
  const findSpace = (dayOfWeek: number): { id: string; name: string } | null => {
    for (const space of spaces) {
      const conflict = existingSchedules.some(
        (s) =>
          s.spaceId === space.id &&
          s.dayOfWeek === dayOfWeek &&
          overlaps(startMin, endMin, timeToMinutes(s.startTime), timeToMinutes(s.endTime))
      );
      if (!conflict) return { id: space.id, name: space.name };
    }
    return null;
  };

  const assignments: BulkAssignment[] = [];

  for (const dayOfWeek of days as number[]) {
    // Find eligible coaches available this day at this time with no conflicts
    const availableCoaches: { id: string; name: string; load: number }[] = [];

    for (const coachId of eligibleCoachIds) {
      const info = coachInfoMap.get(coachId);
      if (!info) continue;

      // Check availability covers this time slot
      const hasAvailability = info.availability.some(
        (a) =>
          a.dayOfWeek === dayOfWeek &&
          timeToMinutes(a.startTime) <= startMin &&
          timeToMinutes(a.endTime) >= endMin
      );
      if (!hasAvailability) continue;

      // Check no existing schedule conflict
      const hasConflict = existingSchedules.some(
        (s) =>
          s.coachProfileId === coachId &&
          s.dayOfWeek === dayOfWeek &&
          overlaps(startMin, endMin, timeToMinutes(s.startTime), timeToMinutes(s.endTime))
      );
      if (hasConflict) continue;

      const load = coachDayLoad.get(coachId)?.get(dayOfWeek) ?? 0;
      availableCoaches.push({ id: coachId, name: info.name, load });
    }

    // Pick coach with least classes this day (load balance)
    availableCoaches.sort((a, b) => a.load - b.load);
    const bestCoach = availableCoaches[0] ?? null;

    const space = findSpace(dayOfWeek);

    assignments.push({
      dayOfWeek,
      coachProfileId: bestCoach?.id ?? null,
      coachName: bestCoach?.name ?? null,
      spaceId: space?.id ?? null,
      spaceName: space?.name ?? null,
    });

    // Update load tracking for subsequent days
    if (bestCoach) {
      if (!coachDayLoad.has(bestCoach.id)) {
        coachDayLoad.set(bestCoach.id, new Map());
      }
      const dayMap = coachDayLoad.get(bestCoach.id)!;
      dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) ?? 0) + 1);
    }
  }

  return success({
    assignments,
    classId: cls.id,
    className: cls.name,
    duration: cls.duration,
    startTime,
    endTime,
    locationId,
  });
}
