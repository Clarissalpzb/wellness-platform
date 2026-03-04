import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

// POST /api/bookings/checkin - Check in a booking
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "users:checkin");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const { bookingId } = body;

  if (!bookingId) {
    return badRequest("Se requiere bookingId");
  }

  // Find the booking and verify it belongs to the org
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      classSchedule: {
        include: {
          class: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!booking || booking.classSchedule.class.organizationId !== orgId) {
    return notFound("Reserva no encontrada");
  }

  if (booking.status !== "CONFIRMED") {
    return badRequest("Solo se pueden registrar reservas confirmadas");
  }

  // Check in the booking
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });

  // Handle referral completion: if this is the user's first CHECKED_IN booking
  const checkedInCount = await db.booking.count({
    where: {
      userId: booking.userId,
      status: "CHECKED_IN",
    },
  });

  // If this is their first check-in (the one we just updated is the only one)
  if (checkedInCount === 1) {
    const referral = await db.referral.findUnique({
      where: { referredUserId: booking.userId },
    });

    if (referral && !referral.completedAt) {
      // Get org settings for referral bonus amount
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const settings = (org?.settings as Record<string, unknown>) || {};
      const bonusAmount = (typeof settings.referralBonusAmount === "number"
        ? settings.referralBonusAmount
        : 100) as number;

      await db.referral.update({
        where: { id: referral.id },
        data: {
          completedAt: new Date(),
          bonusAmount,
        },
      });
    }
  }

  return success(updated);
}
