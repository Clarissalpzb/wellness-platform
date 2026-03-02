import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const upcoming = searchParams.get("upcoming");

  const where: any = { userId };

  if (upcoming === "true") {
    const todayStart = new Date(new Date().toISOString().split("T")[0]);
    where.date = { gte: todayStart };
    where.status = { in: ["CONFIRMED", "CHECKED_IN"] };
  } else if (statusFilter) {
    where.status = statusFilter;
  }

  const bookings = await db.booking.findMany({
    where,
    include: {
      classSchedule: {
        include: {
          class: { select: { name: true, color: true, duration: true, category: true } },
          location: { select: { name: true } },
          space: { select: { name: true } },
          coachProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: { date: upcoming === "true" ? "asc" : "desc" },
  });

  const result = bookings.map((b) => ({
    id: b.id,
    date: b.date,
    status: b.status,
    checkedInAt: b.checkedInAt,
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
    source: b.source,
    createdAt: b.createdAt,
    className: b.classSchedule.class.name,
    classColor: b.classSchedule.class.color,
    duration: b.classSchedule.class.duration,
    category: b.classSchedule.class.category,
    time: b.classSchedule.startTime,
    endTime: b.classSchedule.endTime,
    location: b.classSchedule.location?.name ?? "",
    space: b.classSchedule.space?.name ?? "",
    coach: b.classSchedule.coachProfile
      ? `${b.classSchedule.coachProfile.user.firstName} ${b.classSchedule.coachProfile.user.lastName}`
      : "",
  }));

  return success(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  const { classScheduleId, date } = body;
  if (!classScheduleId || !date) {
    return badRequest("classScheduleId y date son requeridos");
  }

  const bookingDate = new Date(date);
  if (isNaN(bookingDate.getTime())) {
    return badRequest("Fecha inválida");
  }

  // Verify the schedule exists and is active (cross-org booking allowed)
  const schedule = await db.classSchedule.findFirst({
    where: {
      id: classScheduleId,
      class: { isActive: true },
      isCancelled: false,
    },
    include: {
      class: { select: { maxCapacity: true, waitlistMax: true, name: true } },
    },
  });

  if (!schedule) {
    return notFound("Horario no encontrado");
  }

  // Check if user already has a booking for this schedule on this date
  const dateStart = new Date(bookingDate.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  const existingBooking = await db.booking.findFirst({
    where: {
      userId,
      classScheduleId,
      date: { gte: dateStart, lt: dateEnd },
      status: { not: "CANCELLED" },
    },
  });

  if (existingBooking) {
    return badRequest("Ya tienes una reserva para esta clase en esta fecha");
  }

  // Check if user is already on the waitlist
  const existingWaitlist = await db.waitlistEntry.findUnique({
    where: {
      userId_classScheduleId_date: {
        userId,
        classScheduleId,
        date: dateStart,
      },
    },
  });

  if (existingWaitlist && !existingWaitlist.promotedAt && !existingWaitlist.expiredAt) {
    return badRequest("Ya estás en la lista de espera para esta clase");
  }

  // Count current non-cancelled bookings for capacity check
  const currentEnrollment = await db.booking.count({
    where: {
      classScheduleId,
      date: { gte: dateStart, lt: dateEnd },
      status: { not: "CANCELLED" },
    },
  });

  // Find user's active package with remaining classes
  const activePackages = await db.userPackage.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "asc" },
  });

  const activePackage = activePackages.find(
    (pkg) => pkg.classesTotal === null || pkg.classesUsed < pkg.classesTotal
  ) ?? null;

  // If class is full, add to waitlist
  if (currentEnrollment >= schedule.class.maxCapacity) {
    // Check waitlist capacity
    const waitlistCount = await db.waitlistEntry.count({
      where: {
        classScheduleId,
        date: dateStart,
        promotedAt: null,
        expiredAt: null,
      },
    });

    if (waitlistCount >= schedule.class.waitlistMax) {
      return badRequest("La clase y la lista de espera están llenas");
    }

    const waitlistEntry = await db.waitlistEntry.create({
      data: {
        userId,
        classScheduleId,
        date: dateStart,
        position: waitlistCount + 1,
      },
    });

    return success(
      {
        waitlisted: true,
        position: waitlistEntry.position,
        waitlistEntryId: waitlistEntry.id,
        className: schedule.class.name,
      },
      201
    );
  }

  // Create the booking
  const booking = await db.booking.create({
    data: {
      userId,
      classScheduleId,
      date: dateStart,
      status: "CONFIRMED",
      source: "app",
      ...(activePackage ? { userPackageId: activePackage.id } : {}),
    },
    include: {
      classSchedule: {
        include: {
          class: { select: { name: true, color: true } },
          location: { select: { name: true } },
        },
      },
    },
  });

  // Increment classesUsed on the package if linked
  if (activePackage) {
    await db.userPackage.update({
      where: { id: activePackage.id },
      data: { classesUsed: { increment: 1 } },
    });
  }

  return success(
    {
      waitlisted: false,
      booking: {
        id: booking.id,
        date: booking.date,
        status: booking.status,
        className: booking.classSchedule.class.name,
        classColor: booking.classSchedule.class.color,
        location: booking.classSchedule.location?.name ?? "",
        time: booking.classSchedule.startTime,
      },
    },
    201
  );
}
