import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { success } from "@/lib/api-helpers";
import { addDays } from "date-fns";

// POST — process recurring bookings for the upcoming week.
// Call this once a week (e.g., every Sunday night) via cron.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.NOTIFICATIONS_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Book for the next 7 days
  const created: number[] = [];
  const skipped: number[] = [];

  const recurringBookings = await db.recurringBooking.findMany({
    where: { isActive: true },
    include: {
      classSchedule: {
        include: {
          class: { select: { maxCapacity: true, organizationId: true } },
        },
      },
      user: {
        include: {
          userPackages: {
            where: { isActive: true, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: "asc" },
          },
        },
      },
    },
  });

  for (const rb of recurringBookings) {
    const { dayOfWeek } = rb.classSchedule;

    // Find the next occurrence of this day of week within the next 7 days
    for (let i = 1; i <= 7; i++) {
      const candidate = addDays(today, i);
      if (candidate.getDay() !== dayOfWeek) continue;

      const dateStart = new Date(candidate.toISOString().split("T")[0]);
      const dateEnd = new Date(dateStart.getTime() + 86400000);

      // Skip if booking already exists
      const existing = await db.booking.findFirst({
        where: {
          userId: rb.userId,
          classScheduleId: rb.classScheduleId,
          date: { gte: dateStart, lt: dateEnd },
          status: { not: "CANCELLED" },
        },
      });
      if (existing) { skipped.push(rb.id as unknown as number); continue; }

      // Check capacity
      const enrolled = await db.booking.count({
        where: {
          classScheduleId: rb.classScheduleId,
          date: { gte: dateStart, lt: dateEnd },
          status: { not: "CANCELLED" },
        },
      });
      if (enrolled >= rb.classSchedule.class.maxCapacity) { skipped.push(rb.id as unknown as number); continue; }

      // Find a valid package
      const orgId = rb.classSchedule.class.organizationId;
      const pkg = rb.user.userPackages.find(
        (up) =>
          (up as any).package?.organizationId === orgId &&
          (up.classesTotal === null || up.classesUsed < (up.classesTotal ?? 0))
      );
      if (!pkg) { skipped.push(rb.id as unknown as number); continue; }

      await db.booking.create({
        data: {
          userId: rb.userId,
          classScheduleId: rb.classScheduleId,
          date: dateStart,
          status: "CONFIRMED",
          source: "recurring",
          userPackageId: pkg.id,
        },
      });
      await db.userPackage.update({
        where: { id: pkg.id },
        data: { classesUsed: { increment: 1 } },
      });

      created.push(rb.id as unknown as number);
      break; // only book once per recurring entry per week
    }
  }

  return success({ created: created.length, skipped: skipped.length });
}
