import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      avatar: true,
      healthFlags: true,
      preferences: true,
      createdAt: true,
      userPackages: {
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          package: {
            select: {
              name: true,
              type: true,
              classLimit: true,
              validityDays: true,
              organizationId: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { expiresAt: "asc" },
      },
      _count: {
        select: { bookings: true },
      },
    },
  });

  if (!user) return unauthorized();

  // Compute stats: classes this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const classesThisMonth = await db.booking.count({
    where: {
      userId,
      date: { gte: monthStart, lt: monthEnd },
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
    },
  });

  // Compute streak: consecutive weeks with at least one completed/checked-in booking
  let streak = 0;
  const weekMs = 7 * 86400000;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(currentWeekStart.getTime() - i * weekMs);
    const weekEnd = new Date(weekStart.getTime() + weekMs);

    const count = await db.booking.count({
      where: {
        userId,
        date: { gte: weekStart, lt: weekEnd },
        status: { in: ["CHECKED_IN", "COMPLETED"] },
      },
    });

    if (count > 0) {
      streak++;
    } else {
      // Allow current week to have zero if we haven't had a class yet
      if (i === 0) continue;
      break;
    }
  }

  // Favorite class: most booked class name
  const favoriteClassAgg = await db.booking.groupBy({
    by: ["classScheduleId"],
    where: {
      userId,
      status: { not: "CANCELLED" },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let favoriteClass: string | null = null;
  if (favoriteClassAgg.length > 0) {
    const topSchedule = await db.classSchedule.findUnique({
      where: { id: favoriteClassAgg[0].classScheduleId },
      include: { class: { select: { name: true } } },
    });
    favoriteClass = topSchedule?.class.name ?? null;
  }

  // Discipline breakdown: count completed/checked-in bookings by class category
  const allBookings = await db.booking.findMany({
    where: { userId, status: { in: ["CHECKED_IN", "COMPLETED"] } },
    include: {
      classSchedule: {
        include: { class: { select: { category: true, name: true } } },
      },
    },
  });

  const disciplineMap: Record<string, number> = {};
  for (const b of allBookings) {
    const cat = b.classSchedule.class.category ?? b.classSchedule.class.name;
    disciplineMap[cat] = (disciplineMap[cat] ?? 0) + 1;
  }
  const disciplines = Object.entries(disciplineMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const totalClasses = allBookings.length;

  // Milestones: fixed thresholds
  const milestoneThresholds = [1, 5, 10, 25, 50, 100, 200, 500];
  const milestones = milestoneThresholds.map((t) => ({
    target: t,
    achieved: totalClasses >= t,
    label: `${t} clase${t !== 1 ? "s" : ""}`,
  }));

  return success({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    avatar: user.avatar,
    healthFlags: user.healthFlags,
    preferences: user.preferences,
    memberSince: user.createdAt,
    packages: user.userPackages.map((up) => ({
      id: up.id,
      name: up.package.name,
      type: up.package.type,
      classesUsed: up.classesUsed,
      classesTotal: up.classesTotal,
      expiresAt: up.expiresAt,
      classLimit: up.package.classLimit,
      studioName: up.package.organization.name,
      organizationId: up.package.organizationId,
    })),
    totalBookings: user._count.bookings,
    stats: {
      classesThisMonth,
      streak,
      favoriteClass,
      totalClasses,
      disciplines,
      milestones,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  // Only allow updating specific fields
  const allowedFields = ["firstName", "lastName", "phone", "dateOfBirth", "healthFlags", "preferences"];
  const updateData: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Parse dateOfBirth as Date if provided
  if (updateData.dateOfBirth !== undefined) {
    updateData.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
  }

  if (Object.keys(updateData).length === 0) {
    return badRequest("No se proporcionaron campos para actualizar");
  }

  // Validate firstName and lastName are non-empty strings if provided
  if (updateData.firstName !== undefined && typeof updateData.firstName !== "string") {
    return badRequest("firstName debe ser una cadena de texto");
  }
  if (updateData.firstName !== undefined && updateData.firstName.trim().length === 0) {
    return badRequest("firstName no puede estar vacío");
  }
  if (updateData.lastName !== undefined && typeof updateData.lastName !== "string") {
    return badRequest("lastName debe ser una cadena de texto");
  }
  if (updateData.lastName !== undefined && updateData.lastName.trim().length === 0) {
    return badRequest("lastName no puede estar vacío");
  }

  // Trim string fields
  if (typeof updateData.firstName === "string") {
    updateData.firstName = updateData.firstName.trim();
  }
  if (typeof updateData.lastName === "string") {
    updateData.lastName = updateData.lastName.trim();
  }
  if (typeof updateData.phone === "string") {
    updateData.phone = updateData.phone.trim();
  }

  const updated = await db.user.update({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      healthFlags: true,
      preferences: true,
    },
    data: updateData,
  });

  return success(updated);
}
