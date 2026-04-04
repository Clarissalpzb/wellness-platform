import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, badRequest, success, requirePermission } from "@/lib/api-helpers";
import { getResend } from "@/lib/resend";

// POST — request a substitute for a class schedule on a specific date.
// Steps:
//   1. Cancel original coach on that date (mark schedule with a substitute note)
//   2. Notify available coaches (those with no conflicting class + matching availability)
//   3. Notify enrolled clients that the coach may change
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id: scheduleId } = await params;

  const body = await req.json();
  const { date, reason } = body;
  if (!date) return badRequest("date requerida");

  const schedule = await db.classSchedule.findFirst({
    where: { id: scheduleId, class: { organizationId: orgId } },
    include: {
      class: { select: { name: true, organizationId: true } },
      location: { select: { name: true } },
      coachProfile: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  if (!schedule) return notFound("Horario no encontrado");

  const classDate = new Date(date);
  const dateStart = new Date(classDate.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Wellness Platform <onboarding@resend.dev>";
  const resend = getResend();

  // Find coaches in this org with availability on the class's day of week
  const dayOfWeek = classDate.getDay();
  const availableCoaches = await db.coachProfile.findMany({
    where: {
      user: { organizationId: orgId, isActive: true },
      availability: {
        some: {
          dayOfWeek,
          isActive: true,
          startTime: { lte: schedule.startTime },
          endTime: { gte: schedule.endTime },
        },
      },
      // Exclude the original coach
      id: { not: schedule.coachProfileId ?? undefined },
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Filter out coaches who already have a class at this time on this date
  const freeCoachs = [];
  for (const coach of availableCoaches) {
    const conflict = await db.booking.findFirst({
      where: {
        classSchedule: {
          coachProfileId: coach.id,
          OR: [
            { dayOfWeek, isRecurring: true },
            { specificDate: { gte: dateStart, lt: dateEnd } },
          ],
        },
        date: { gte: dateStart, lt: dateEnd },
        status: { not: "CANCELLED" },
      },
    });
    if (!conflict) freeCoachs.push(coach);
  }

  const coachNotifications: string[] = [];
  for (const coach of freeCoachs) {
    try {
      await resend.emails.send({
        from: fromAddress,
        to: coach.user.email,
        subject: `¿Puedes cubrir una clase? — ${schedule.class.name} 🙏`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="background: #f97316; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Se necesita un sustituto</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Hola ${coach.user.firstName}, necesitamos saber si puedes cubrir la siguiente clase:</p>
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <strong>${schedule.class.name}</strong><br/>
                ${classDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                · ${schedule.startTime} – ${schedule.endTime}<br/>
                ${schedule.location?.name ?? ""}
                ${reason ? `<br/><em style="color: #9ca3af;">Motivo: ${reason}</em>` : ""}
              </div>
              <p style="text-align: center;">
                <a href="${appUrl}/coach" style="background: #f97316; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Ver detalles en mi portal
                </a>
              </p>
            </div>
          </div>
        `,
      });
      coachNotifications.push(coach.user.email);
    } catch {
      // Non-blocking
    }
  }

  // Notify enrolled clients
  const enrolledBookings = await db.booking.findMany({
    where: {
      classScheduleId: scheduleId,
      date: { gte: dateStart, lt: dateEnd },
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    include: { user: { select: { email: true, firstName: true } } },
  });

  let clientNotifications = 0;
  for (const b of enrolledBookings) {
    try {
      await resend.emails.send({
        from: fromAddress,
        to: b.user.email,
        subject: `Actualización sobre tu clase de ${schedule.class.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="background: #3b82f6; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Cambio en tu clase</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Hola ${b.user.firstName}, te informamos que el coach asignado para tu clase del ${classDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} podría cambiar. Estamos buscando un sustituto y te avisaremos en cuanto lo confirmemos.</p>
              <p>Tu reserva sigue activa. Si tienes dudas, contáctanos.</p>
              <p style="text-align: center;">
                <a href="${appUrl}/app/mis-reservas" style="background: #3b82f6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Ver mis reservas
                </a>
              </p>
            </div>
          </div>
        `,
      });
      clientNotifications++;
    } catch {
      // Non-blocking
    }
  }

  return success({
    availableCoaches: freeCoachs.length,
    coachesNotified: coachNotifications.length,
    clientsNotified: clientNotifications,
    coachEmails: coachNotifications,
  });
}
