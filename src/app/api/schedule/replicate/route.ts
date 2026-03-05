import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  const { targetWeekStart } = body;
  if (!targetWeekStart) {
    return badRequest("Se requiere targetWeekStart (fecha del lunes de la semana objetivo)");
  }

  const monday = new Date(targetWeekStart);
  if (isNaN(monday.getTime())) {
    return badRequest("Fecha inválida");
  }

  // Verify it's a Monday (getDay() === 1)
  if (monday.getDay() !== 1) {
    return badRequest("La fecha debe ser un lunes");
  }

  // Fetch all recurring, active, non-cancelled schedules for the org
  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: orgId, isActive: true },
      isRecurring: true,
      isCancelled: false,
    },
    select: {
      classId: true,
      locationId: true,
      spaceId: true,
      coachProfileId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });

  let created = 0;

  for (const schedule of schedules) {
    // Compute the specific date in the target week
    // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Monday is day 1, so offset from Monday = (dayOfWeek + 6) % 7
    const offsetFromMonday = (schedule.dayOfWeek + 6) % 7;
    const specificDate = new Date(monday);
    specificDate.setDate(monday.getDate() + offsetFromMonday);

    // Check if schedule already exists for same classId + startTime + specificDate
    const startOfDay = new Date(specificDate.toISOString().split("T")[0]);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const existing = await db.classSchedule.findFirst({
      where: {
        classId: schedule.classId,
        startTime: schedule.startTime,
        specificDate: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (existing) continue;

    await db.classSchedule.create({
      data: {
        classId: schedule.classId,
        locationId: schedule.locationId,
        spaceId: schedule.spaceId,
        coachProfileId: schedule.coachProfileId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isRecurring: false,
        specificDate: startOfDay,
      },
    });

    created++;
  }

  return success({ created, message: `Se crearon ${created} horarios para la semana seleccionada` });
}
