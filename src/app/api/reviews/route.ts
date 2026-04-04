import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

// POST — submit a review for a completed booking
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const body = await req.json();
  const { bookingId, rating, comment } = body;

  if (!bookingId || !rating) return badRequest("bookingId y rating son requeridos");
  if (rating < 1 || rating > 5) return badRequest("rating debe ser entre 1 y 5");

  // Verify the booking belongs to the user and is completed/checked-in
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
      status: { in: ["COMPLETED", "CHECKED_IN"] },
    },
    select: { classScheduleId: true },
  });

  if (!booking) return badRequest("Reserva no encontrada o no elegible para reseña");

  // Prevent duplicate reviews
  const existing = await db.classReview.findUnique({
    where: { bookingId },
  });
  if (existing) return badRequest("Ya enviaste una reseña para esta clase");

  const review = await db.classReview.create({
    data: {
      userId,
      bookingId,
      classScheduleId: booking.classScheduleId,
      rating,
      comment: comment?.trim() || null,
    },
  });

  return success(review, 201);
}

// GET — get reviews for a class schedule (admin/coach use)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const classScheduleId = searchParams.get("classScheduleId");
  const coachProfileId = searchParams.get("coachProfileId");

  const where: any = {};
  if (classScheduleId) where.classScheduleId = classScheduleId;
  if (coachProfileId) where.classSchedule = { coachProfileId };

  const reviews = await db.classReview.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, avatar: true } },
      classSchedule: { include: { class: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return success({ avgRating, count: reviews.length, reviews });
}
