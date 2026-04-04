import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { scheduleSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const userOrgId = (session.user as any).organizationId as string | null;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const dayOfWeekParam = searchParams.get("dayOfWeek");
  const orgIdParam = searchParams.get("orgId");

  // Determine which org to query
  const targetOrgId = orgIdParam || userOrgId;

  let dayOfWeek: number;
  let targetDate: Date;

  if (dateParam) {
    targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      return badRequest("Fecha inválida");
    }
    dayOfWeek = targetDate.getDay();
  } else if (dayOfWeekParam !== null) {
    dayOfWeek = parseInt(dayOfWeekParam, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return badRequest("dayOfWeek debe ser un número entre 0 y 6");
    }
    targetDate = new Date();
  } else {
    targetDate = new Date();
    dayOfWeek = targetDate.getDay();
  }

  // If no org to query, return empty
  if (!targetOrgId) {
    return success([]);
  }

  const dateStart = new Date(targetDate.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  // Check if the requesting user has an active package for this org (for dynamic pricing)
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  let userHasActivePackage = false;
  if (userRole === "CLIENT" && userId) {
    const activePkg = await db.userPackage.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
        package: { organizationId: targetOrgId },
      },
    });
    userHasActivePackage = !!activePkg;
  }

  const now = new Date();
  const classDateMs = dateStart.getTime();
  const within24h = (classDateMs - now.getTime()) <= 86400000;

  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: targetOrgId, isActive: true },
      isCancelled: false,
      OR: [
        { dayOfWeek, isRecurring: true },
        { specificDate: { gte: dateStart, lt: dateEnd } },
      ],
    },
    include: {
      class: {
        select: {
          name: true,
          color: true,
          duration: true,
          maxCapacity: true,
          category: true,
          level: true,
          organizationId: true,
        },
      },
      location: { select: { name: true } },
      space: { select: { name: true } },
      coachProfile: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      bookings: {
        where: {
          date: { gte: dateStart, lt: dateEnd },
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const result = schedules.map((s) => {
    const enrolled = s.bookings.length;
    const capacity = s.class.maxCapacity;
    const occupancy = capacity > 0 ? enrolled / capacity : 0;
    // Show discount only to users WITHOUT an active package (non-members)
    const hasDiscount = !userHasActivePackage && within24h && occupancy < 0.4;

    return {
      id: s.id,
      time: s.startTime,
      endTime: s.endTime,
      name: s.class.name,
      color: s.class.color,
      duration: s.class.duration,
      capacity,
      category: s.class.category,
      level: s.class.level,
      location: s.location?.name ?? "",
      space: s.space?.name ?? "",
      coach: s.coachProfile
        ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
        : "",
      enrolled,
      available: capacity - enrolled,
      organizationId: s.class.organizationId,
      hasDiscount,
      discountPercent: hasDiscount ? 30 : 0,
    };
  });

  return success(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const cls = await db.class.findFirst({
    where: { id: parsed.data.classId, organizationId: orgId },
  });
  if (!cls) return notFound("Clase no encontrada");

  const schedule = await db.classSchedule.create({
    data: parsed.data,
  });

  return success(schedule, 201);
}
