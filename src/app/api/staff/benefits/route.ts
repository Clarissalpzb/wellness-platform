import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, requirePermission, success } from "@/lib/api-helpers";

const FREE_CLASSES_PER_MONTH = 4;

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "benefits:view_own");
  if (deny) return deny;

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Monthly free class usage
  const freeClassesUsed = await db.booking.count({
    where: {
      userId,
      date: { gte: monthStart, lt: monthEnd },
      status: { not: "CANCELLED" },
      source: "staff_perk",
    },
  });

  // Upcoming booked classes
  const today = new Date(now.toISOString().split("T")[0]);
  const upcomingBookings = await db.booking.findMany({
    where: {
      userId,
      date: { gte: today },
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    include: {
      classSchedule: {
        include: {
          class: { select: { name: true, color: true, duration: true } },
          location: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  // Referral stats
  const referrals = await db.clientReferral.findMany({
    where: { referrerId: userId },
  });

  // User hourly rate (for earnings display)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { hourlyRate: true, firstName: true, organizationId: true },
  });

  return success({
    freeClasses: {
      used: freeClassesUsed,
      total: FREE_CLASSES_PER_MONTH,
      remaining: Math.max(0, FREE_CLASSES_PER_MONTH - freeClassesUsed),
    },
    upcomingBookings: upcomingBookings.map((b) => ({
      id: b.id,
      date: b.date,
      status: b.status,
      source: b.source,
      className: b.classSchedule.class.name,
      classColor: b.classSchedule.class.color,
      duration: b.classSchedule.class.duration,
      time: b.classSchedule.startTime,
      location: b.classSchedule.location?.name ?? "",
    })),
    referrals: {
      total: referrals.length,
      rewarded: referrals.filter((r) => r.referrerRewarded).length,
      pending: referrals.filter((r) => !r.referrerRewarded).length,
    },
    hourlyRate: user?.hourlyRate ?? null,
  });
}
