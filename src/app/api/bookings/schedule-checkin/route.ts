import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, requirePermission } from "@/lib/api-helpers";

// GET /api/bookings/schedule-checkin - Get schedules with bookings for check-in
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "users:checkin");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  const dayOfWeek = date.getDay(); // 0-6

  // Normalize date to start/end of day for booking query
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Find all class schedules for this day of week in the org
  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: orgId },
      isCancelled: false,
      OR: [
        { isRecurring: true, dayOfWeek },
        {
          isRecurring: false,
          specificDate: { gte: startOfDay, lte: endOfDay },
        },
      ],
    },
    include: {
      class: { select: { id: true, name: true, color: true, maxCapacity: true } },
      location: { select: { name: true } },
      space: { select: { name: true } },
      coachProfile: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      bookings: {
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { in: ["CONFIRMED", "CHECKED_IN", "CANCELLED"] },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const result = schedules.map((s) => ({
    id: s.id,
    className: s.class.name,
    classColor: s.class.color,
    time: s.startTime,
    endTime: s.endTime,
    coach: s.coachProfile
      ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
      : null,
    location: s.location.name,
    space: s.space?.name ?? null,
    capacity: s.class.maxCapacity,
    bookings: s.bookings.map((b) => ({
      id: b.id,
      userId: b.user.id,
      userName: `${b.user.firstName} ${b.user.lastName}`,
      userAvatar: b.user.avatar,
      status: b.status,
      checkedInAt: b.checkedInAt,
    })),
  }));

  return success({ schedules: result });
}
