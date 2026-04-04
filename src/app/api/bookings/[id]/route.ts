import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";
import { getResend } from "@/lib/resend";

async function notifyWaitlistPromotion(
  userId: string,
  classScheduleId: string,
  bookingDate: Date
) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    const schedule = await db.classSchedule.findUnique({
      where: { id: classScheduleId },
      include: {
        class: { select: { name: true } },
        location: { select: { name: true } },
      },
    });
    if (!user || !schedule) return;

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "Wellness Platform <onboarding@resend.dev>";
    const dateStr = bookingDate.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const resend = getResend();
    await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject: `¡Tu lugar está listo! — ${schedule.class.name} 🎉`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
          <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">¡Tienes un lugar! 🎉</h1>
          </div>
          <div style="background: white; padding: 28px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #404040; line-height: 1.6;">
              Hola ${user.firstName}, se liberó un lugar en la clase que estabas esperando:
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 4px; font-weight: 700; font-size: 17px; color: #15803d;">${schedule.class.name}</p>
              <p style="margin: 0; font-size: 14px; color: #525252;">
                ${dateStr} · ${schedule.startTime} – ${schedule.endTime}
                ${schedule.location ? ` · ${schedule.location.name}` : ""}
              </p>
            </div>
            <p style="font-size: 14px; color: #737373;">Tu reserva ya está confirmada. ¡Te esperamos!</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}/app/mis-reservas"
                 style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Ver mis reservas
              </a>
            </div>
          </div>
        </div>
      `,
    });
  } catch {
    // Non-blocking — don't fail the cancellation if email fails
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: { id, userId },
    include: {
      classSchedule: {
        include: {
          class: {
            select: {
              name: true,
              color: true,
              duration: true,
              maxCapacity: true,
              category: true,
              level: true,
              description: true,
              cancellationPolicy: true,
            },
          },
          location: { select: { name: true, address: true } },
          space: { select: { name: true } },
          coachProfile: {
            include: {
              user: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
      },
      userPackage: {
        include: {
          package: { select: { name: true, type: true } },
        },
      },
    },
  });

  if (!booking) return notFound("Reserva no encontrada");

  // Count enrollment for this schedule on the booking date
  const dateStart = new Date(booking.date.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  const enrolled = await db.booking.count({
    where: {
      classScheduleId: booking.classScheduleId,
      date: { gte: dateStart, lt: dateEnd },
      status: { not: "CANCELLED" },
    },
  });

  return success({
    id: booking.id,
    date: booking.date,
    status: booking.status,
    checkedInAt: booking.checkedInAt,
    cancelledAt: booking.cancelledAt,
    cancelReason: booking.cancelReason,
    source: booking.source,
    createdAt: booking.createdAt,
    schedule: {
      id: booking.classSchedule.id,
      time: booking.classSchedule.startTime,
      endTime: booking.classSchedule.endTime,
      dayOfWeek: booking.classSchedule.dayOfWeek,
    },
    class: {
      name: booking.classSchedule.class.name,
      color: booking.classSchedule.class.color,
      duration: booking.classSchedule.class.duration,
      capacity: booking.classSchedule.class.maxCapacity,
      category: booking.classSchedule.class.category,
      level: booking.classSchedule.class.level,
      description: booking.classSchedule.class.description,
      cancellationPolicy: booking.classSchedule.class.cancellationPolicy,
    },
    location: booking.classSchedule.location?.name ?? "",
    locationAddress: booking.classSchedule.location?.address ?? "",
    space: booking.classSchedule.space?.name ?? "",
    coach: booking.classSchedule.coachProfile
      ? {
          name: `${booking.classSchedule.coachProfile.user.firstName} ${booking.classSchedule.coachProfile.user.lastName}`,
          avatar: booking.classSchedule.coachProfile.user.avatar,
        }
      : null,
    package: booking.userPackage
      ? {
          name: booking.userPackage.package.name,
          type: booking.userPackage.package.type,
        }
      : null,
    enrolled,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: { id, userId },
  });

  if (!booking) return notFound("Reserva no encontrada");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  const { status, cancelReason } = body;

  if (status === "CANCELLED") {
    if (booking.status === "CANCELLED") {
      return badRequest("La reserva ya está cancelada");
    }

    if (booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
      return badRequest("No se puede cancelar una reserva completada");
    }

    const updated = await db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: cancelReason || null,
      },
    });

    // Restore class credit to user's package if applicable
    if (booking.userPackageId) {
      await db.userPackage.update({
        where: { id: booking.userPackageId },
        data: { classesUsed: { decrement: 1 } },
      });
    }

    // Promote first person on the waitlist
    const dateStart = new Date(booking.date.toISOString().split("T")[0]);
    const nextInLine = await db.waitlistEntry.findFirst({
      where: {
        classScheduleId: booking.classScheduleId,
        date: dateStart,
        promotedAt: null,
        expiredAt: null,
      },
      orderBy: { position: "asc" },
    });

    if (nextInLine) {
      // Find an active package for the waitlisted user
      const waitlistUserPackage = await db.userPackage.findFirst({
        where: {
          userId: nextInLine.userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "asc" },
      });

      await db.$transaction([
        db.waitlistEntry.update({
          where: { id: nextInLine.id },
          data: { promotedAt: new Date() },
        }),
        db.booking.create({
          data: {
            userId: nextInLine.userId,
            classScheduleId: booking.classScheduleId,
            date: booking.date,
            status: "CONFIRMED",
            source: "waitlist",
            ...(waitlistUserPackage
              ? { userPackageId: waitlistUserPackage.id }
              : {}),
          },
        }),
        ...(waitlistUserPackage
          ? [
              db.userPackage.update({
                where: { id: waitlistUserPackage.id },
                data: { classesUsed: { increment: 1 } },
              }),
            ]
          : []),
      ]);

      // Notify the promoted user via email (non-blocking)
      notifyWaitlistPromotion(nextInLine.userId, booking.classScheduleId, booking.date);
    }

    return success({
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt,
      cancelReason: updated.cancelReason,
    });
  }

  return badRequest("Solo se permite actualizar el estado a CANCELLED");
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: { id, userId },
  });

  if (!booking) return notFound("Reserva no encontrada");

  if (booking.status === "CANCELLED") {
    return badRequest("La reserva ya está cancelada");
  }

  if (booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
    return badRequest("No se puede cancelar una reserva completada");
  }

  const updated = await db.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  // Restore class credit to user's package if applicable
  if (booking.userPackageId) {
    await db.userPackage.update({
      where: { id: booking.userPackageId },
      data: { classesUsed: { decrement: 1 } },
    });
  }

  // Promote first person on the waitlist
  const dateStart = new Date(booking.date.toISOString().split("T")[0]);
  const nextInLine = await db.waitlistEntry.findFirst({
    where: {
      classScheduleId: booking.classScheduleId,
      date: dateStart,
      promotedAt: null,
      expiredAt: null,
    },
    orderBy: { position: "asc" },
  });

  if (nextInLine) {
    const waitlistUserPackage = await db.userPackage.findFirst({
      where: {
        userId: nextInLine.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "asc" },
    });

    await db.$transaction([
      db.waitlistEntry.update({
        where: { id: nextInLine.id },
        data: { promotedAt: new Date() },
      }),
      db.booking.create({
        data: {
          userId: nextInLine.userId,
          classScheduleId: booking.classScheduleId,
          date: booking.date,
          status: "CONFIRMED",
          source: "waitlist",
          ...(waitlistUserPackage
            ? { userPackageId: waitlistUserPackage.id }
            : {}),
        },
      }),
      ...(waitlistUserPackage
        ? [
            db.userPackage.update({
              where: { id: waitlistUserPackage.id },
              data: { classesUsed: { increment: 1 } },
            }),
          ]
        : []),
    ]);

    // Notify the promoted user via email (non-blocking)
    notifyWaitlistPromotion(nextInLine.userId, booking.classScheduleId, booking.date);
  }

  return success({
    id: updated.id,
    status: updated.status,
    cancelledAt: updated.cancelledAt,
  });
}
