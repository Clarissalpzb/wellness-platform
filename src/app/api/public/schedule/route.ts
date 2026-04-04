import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { badRequest, success } from "@/lib/api-helpers";

// Public endpoint — no auth required. Returns schedule for a given org slug + date.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const dateParam = searchParams.get("date");

  if (!slug) return badRequest("slug requerido");

  const org = await db.organization.findUnique({ where: { slug } });
  if (!org) return badRequest("Organización no encontrada");

  const targetDate = dateParam ? new Date(dateParam) : new Date();
  if (isNaN(targetDate.getTime())) return badRequest("Fecha inválida");

  const dayOfWeek = targetDate.getDay();
  const dateStart = new Date(targetDate.toISOString().split("T")[0]);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  // 24h threshold for dynamic pricing (40% occupancy trigger)
  const now = new Date();
  const within24h = (dateStart.getTime() - now.getTime()) <= 86400000;

  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: org.id, isActive: true },
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
          description: true,
        },
      },
      location: { select: { name: true, address: true } },
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

    // Dynamic pricing: 30% off if under 40% full and class is within 24h
    const hasDiscount = within24h && occupancy < 0.4;

    return {
      id: s.id,
      time: s.startTime,
      endTime: s.endTime,
      name: s.class.name,
      description: s.class.description,
      color: s.class.color,
      duration: s.class.duration,
      capacity,
      category: s.class.category,
      level: s.class.level,
      location: s.location?.name ?? "",
      address: s.location?.address ?? "",
      space: s.space?.name ?? "",
      coach: s.coachProfile
        ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
        : "",
      enrolled,
      available: capacity - enrolled,
      hasDiscount,
      discountPercent: hasDiscount ? 30 : 0,
    };
  });

  return success({ org: { id: org.id, name: org.name, slug: org.slug, logo: org.logo }, schedules: result });
}
