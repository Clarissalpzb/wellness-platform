import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

// GET /api/coach/referrals - Return current coach's referral code + referral history
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "referrals:view_own");
  if (deny) return deny;

  const coachProfile = await db.coachProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      referralCode: true,
      referrals: {
        include: {
          referredUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              createdAt: true,
              _count: {
                select: {
                  bookings: {
                    where: { status: "CHECKED_IN" },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!coachProfile) {
    return badRequest("No se encontró perfil de coach");
  }

  const referrals = coachProfile.referrals.map((r) => ({
    id: r.id,
    name: `${r.referredUser.firstName} ${r.referredUser.lastName}`,
    signupDate: r.referredUser.createdAt,
    classesAttended: r.referredUser._count.bookings,
    status: r.completedAt ? "active" : "pending",
    bonusEarned: r.bonusAmount,
    completedAt: r.completedAt,
  }));

  return success({
    referralCode: coachProfile.referralCode,
    referrals,
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter((r) => r.status === "active").length,
    totalBonus: referrals.reduce((sum, r) => sum + r.bonusEarned, 0),
  });
}
