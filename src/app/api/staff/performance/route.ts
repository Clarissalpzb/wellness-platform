import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, requirePermission } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const monthsBack = parseInt(searchParams.get("months") ?? "3", 10);

  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  // Get all coaches for this org
  const coaches = await db.coachProfile.findMany({
    where: { user: { organizationId: orgId, isActive: true } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  const result = await Promise.all(
    coaches.map(async (coach) => {
      // All schedules taught by this coach in the period
      const schedules = await db.classSchedule.findMany({
        where: { coachProfileId: coach.id, isCancelled: false },
        include: {
          class: { select: { maxCapacity: true, name: true } },
          bookings: {
            where: {
              date: { gte: since },
              status: { not: "CANCELLED" },
            },
            select: { id: true, date: true, userId: true },
          },
        },
      });

      // Compute metrics per schedule
      let totalClasses = 0;
      let totalEnrolled = 0;
      let totalCapacity = 0;
      const uniqueClients = new Set<string>();

      for (const s of schedules) {
        const bookingsInPeriod = s.bookings;
        if (bookingsInPeriod.length === 0) continue;
        totalClasses++;
        totalEnrolled += bookingsInPeriod.length;
        totalCapacity += s.class.maxCapacity;
        bookingsInPeriod.forEach((b) => uniqueClients.add(b.userId));
      }

      const avgFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

      // Reviews average (if any)
      const reviews = await db.classReview.findMany({
        where: { classSchedule: { coachProfileId: coach.id } },
        select: { rating: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const avgRating =
        reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : null;

      // Monthly class counts for trend (last 3 months)
      const monthlyTrend: { month: string; classes: number; avgFill: number }[] = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const mStart = new Date();
        mStart.setMonth(mStart.getMonth() - i, 1);
        mStart.setHours(0, 0, 0, 0);
        const mEnd = new Date(mStart);
        mEnd.setMonth(mEnd.getMonth() + 1);

        let mClasses = 0;
        let mEnrolled = 0;
        let mCapacity = 0;
        for (const s of schedules) {
          const inMonth = s.bookings.filter(
            (b) => b.date >= mStart && b.date < mEnd
          );
          if (inMonth.length > 0) {
            mClasses++;
            mEnrolled += inMonth.length;
            mCapacity += s.class.maxCapacity;
          }
        }
        monthlyTrend.push({
          month: mStart.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
          classes: mClasses,
          avgFill: mCapacity > 0 ? Math.round((mEnrolled / mCapacity) * 100) : 0,
        });
      }

      return {
        id: coach.id,
        name: `${coach.user.firstName} ${coach.user.lastName}`,
        avatar: coach.user.avatar,
        totalClasses,
        uniqueClients: uniqueClients.size,
        avgFillRate,
        avgRating,
        reviewCount: reviews.length,
        monthlyTrend,
      };
    })
  );

  // Sort by fill rate desc
  result.sort((a, b) => b.avgFillRate - a.avgFillRate);

  return success(result);
}
