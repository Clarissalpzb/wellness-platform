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
    // Coach referral completion
    const coachReferral = await db.referral.findUnique({
      where: { referredUserId: booking.userId },
    });

    if (coachReferral && !coachReferral.completedAt) {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });
      const settings = (org?.settings as Record<string, unknown>) || {};
      const bonusAmount = (typeof settings.referralBonusAmount === "number"
        ? settings.referralBonusAmount
        : 100) as number;

      await db.referral.update({
        where: { id: coachReferral.id },
        data: { completedAt: new Date(), bonusAmount },
      });
    }

    // Client referral completion — reward the referrer with 1 free class
    const clientReferral = await db.clientReferral.findUnique({
      where: { referredUserId: booking.userId },
    });

    if (clientReferral && !clientReferral.completedAt) {
      await db.clientReferral.update({
        where: { id: clientReferral.id },
        data: { completedAt: new Date() },
      });

      // Grant referrer a free class
      let rewardPkg = await db.package.findFirst({
        where: {
          organizationId: orgId,
          metadata: { path: ["isReferralReward"], equals: true },
        },
      });
      if (!rewardPkg) {
        rewardPkg = await db.package.create({
          data: {
            organizationId: orgId,
            name: "Clase Gratis — Referido",
            description: "1 clase gratis por referir a un amigo.",
            type: "DROP_IN",
            price: 0,
            classLimit: 1,
            validityDays: 30,
            isActive: true,
            metadata: { isReferralReward: true },
          },
        });
      }
      const { addDays } = await import("date-fns");
      await db.userPackage.create({
        data: {
          userId: clientReferral.referrerId,
          packageId: rewardPkg.id,
          classesTotal: 1,
          classesUsed: 0,
          expiresAt: addDays(new Date(), 30),
          isActive: true,
        },
      });
      await db.clientReferral.update({
        where: { id: clientReferral.id },
        data: { referrerRewarded: true },
      });
    }
  }

  return success(updated);
}
