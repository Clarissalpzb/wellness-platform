import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

// GET — list user's recurring bookings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const recurring = await db.recurringBooking.findMany({
    where: { userId: session.user.id, isActive: true },
    include: {
      classSchedule: {
        include: {
          class: { select: { name: true, color: true, category: true } },
          location: { select: { name: true } },
          coachProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });

  const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return success(
    recurring.map((r) => ({
      id: r.id,
      classScheduleId: r.classScheduleId,
      className: r.classSchedule.class.name,
      classColor: r.classSchedule.class.color,
      category: r.classSchedule.class.category,
      day: DAYS[r.classSchedule.dayOfWeek],
      time: r.classSchedule.startTime,
      location: r.classSchedule.location?.name ?? "",
      coach: r.classSchedule.coachProfile
        ? `${r.classSchedule.coachProfile.user.firstName} ${r.classSchedule.coachProfile.user.lastName}`
        : "",
    }))
  );
}

// POST — subscribe to a recurring booking
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const body = await req.json();
  const { classScheduleId } = body;
  if (!classScheduleId) return badRequest("classScheduleId requerido");

  const schedule = await db.classSchedule.findFirst({
    where: { id: classScheduleId, isRecurring: true, isCancelled: false },
    include: { class: { select: { organizationId: true } } },
  });
  if (!schedule) return badRequest("Solo puedes suscribirte a clases recurrentes");

  // Check the user has an active package for this org
  const activePackage = await db.userPackage.findFirst({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
      package: { organizationId: schedule.class.organizationId },
    },
  });
  if (!activePackage) {
    return badRequest("Necesitas un paquete activo para activar reservas recurrentes");
  }

  const existing = await db.recurringBooking.findUnique({
    where: { userId_classScheduleId: { userId, classScheduleId } },
  });

  if (existing) {
    if (existing.isActive) return badRequest("Ya tienes esta clase como recurrente");
    // Reactivate
    const updated = await db.recurringBooking.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return success(updated);
  }

  const recurring = await db.recurringBooking.create({
    data: { userId, classScheduleId },
  });

  return success(recurring, 201);
}
