import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success } from "@/lib/api-helpers";
import { nanoid } from "nanoid";

// GET — get current user's referral code (generate if missing) + stats
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  let user = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, organizationId: true },
  });
  if (!user) return unauthorized();

  // Generate referral code if not set
  if (!user.referralCode) {
    const code = nanoid(8).toUpperCase();
    user = await db.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { referralCode: true, organizationId: true },
    });
  }

  // Referral stats
  const referrals = await db.clientReferral.findMany({
    where: { referrerId: userId },
    include: {
      referredUser: {
        select: { firstName: true, lastName: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const referralLink = `${appUrl}/registro?ref=${user.referralCode}`;

  return success({
    referralCode: user.referralCode,
    referralLink,
    totalReferrals: referrals.length,
    rewarded: referrals.filter((r) => r.referrerRewarded).length,
    pending: referrals.filter((r) => !r.referrerRewarded).length,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: `${r.referredUser.firstName} ${r.referredUser.lastName}`,
      joinedAt: r.referredUser.createdAt,
      completed: !!r.completedAt,
      rewarded: r.referrerRewarded,
    })),
  });
}
