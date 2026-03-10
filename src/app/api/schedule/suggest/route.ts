import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";
import {
  autoSchedule,
  type ClassInput,
  type CoachAvailabilitySlot,
  type ExistingSchedule,
  type SpaceInput,
  type CoachClassLink,
} from "@/lib/schedule/auto-schedule";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  const body = await req.json();
  const { locationId } = body;
  if (!locationId) return badRequest("locationId es requerido");

  // Verify location belongs to org
  const location = await db.location.findFirst({
    where: { id: locationId, organizationId: orgId },
  });
  if (!location) return badRequest("Ubicación no encontrada");

  // Fetch all data in parallel
  const [activeClasses, compensations, existingSchedules, coachProfiles, spaces] =
    await Promise.all([
      db.class.findMany({
        where: { organizationId: orgId, isActive: true },
        select: {
          id: true,
          name: true,
          duration: true,
          maxCapacity: true,
          category: true,
          color: true,
        },
      }),
      db.coachCompensation.findMany({
        where: {
          coachProfile: { user: { organizationId: orgId } },
          effectiveTo: null, // active rules only
        },
        select: { coachProfileId: true, classId: true },
      }),
      db.classSchedule.findMany({
        where: {
          class: { organizationId: orgId },
          isRecurring: true,
          isCancelled: false,
        },
        select: {
          id: true,
          classId: true,
          coachProfileId: true,
          spaceId: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      }),
      db.coachProfile.findMany({
        where: { user: { organizationId: orgId } },
        include: {
          user: { select: { firstName: true, lastName: true } },
          availability: { where: { isActive: true } },
        },
      }),
      db.space.findMany({
        where: { locationId },
        select: { id: true, name: true, capacity: true },
      }),
    ]);

  // Transform to algorithm input types
  const classes: ClassInput[] = activeClasses.map((c) => ({
    id: c.id,
    name: c.name,
    duration: c.duration,
    maxCapacity: c.maxCapacity,
    category: c.category,
    color: c.color,
  }));

  const coachAvailability: CoachAvailabilitySlot[] = coachProfiles.flatMap(
    (cp) =>
      cp.availability.map((a) => ({
        coachProfileId: cp.id,
        coachName: `${cp.user.firstName} ${cp.user.lastName}`,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      }))
  );

  const existing: ExistingSchedule[] = existingSchedules.map((s) => ({
    id: s.id,
    classId: s.classId,
    coachProfileId: s.coachProfileId,
    spaceId: s.spaceId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  const spaceInputs: SpaceInput[] = spaces.map((s) => ({
    id: s.id,
    name: s.name,
    capacity: s.capacity,
  }));

  const activeClassIds = activeClasses.map((c) => c.id);
  const coachClassLinks: CoachClassLink[] = compensations.flatMap((c) => {
    if (c.classId !== null) {
      return [{ coachProfileId: c.coachProfileId, classId: c.classId }];
    }
    // Global rule (classId = null) → link to ALL active classes
    return activeClassIds.map((classId) => ({
      coachProfileId: c.coachProfileId,
      classId,
    }));
  });

  const result = autoSchedule({
    classes,
    coachAvailability,
    existingSchedules: existing,
    spaces: spaceInputs,
    coachClassLinks,
    locationId,
  });

  return success(result);
}
