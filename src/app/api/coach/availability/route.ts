import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

// GET /api/coach/availability - Return current coach's availability slots
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "availability:manage_own");
  if (deny) return deny;

  const coachProfile = await db.coachProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      availability: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!coachProfile) {
    return badRequest("No se encontró perfil de coach");
  }

  return success(coachProfile.availability);
}

// PUT /api/coach/availability - Upsert weekly availability pattern
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "availability:manage_own");
  if (deny) return deny;

  const coachProfile = await db.coachProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!coachProfile) {
    return badRequest("No se encontró perfil de coach");
  }

  const body = await req.json();
  const { slots } = body;

  if (!Array.isArray(slots)) {
    return badRequest("Se requiere un array de slots");
  }

  // Validate each slot
  for (const slot of slots) {
    if (
      typeof slot.dayOfWeek !== "number" ||
      slot.dayOfWeek < 0 ||
      slot.dayOfWeek > 6
    ) {
      return badRequest("dayOfWeek debe ser un número entre 0 y 6");
    }
    if (
      typeof slot.startTime !== "string" ||
      !/^\d{2}:\d{2}$/.test(slot.startTime)
    ) {
      return badRequest("startTime debe tener formato HH:mm");
    }
    if (
      typeof slot.endTime !== "string" ||
      !/^\d{2}:\d{2}$/.test(slot.endTime)
    ) {
      return badRequest("endTime debe tener formato HH:mm");
    }
    if (slot.startTime >= slot.endTime) {
      return badRequest("startTime debe ser anterior a endTime");
    }
  }

  // Delete existing and create new in a transaction
  const result = await db.$transaction(async (tx) => {
    await tx.coachAvailability.deleteMany({
      where: { coachProfileId: coachProfile.id },
    });

    if (slots.length > 0) {
      await tx.coachAvailability.createMany({
        data: slots.map((slot: { dayOfWeek: number; startTime: string; endTime: string }) => ({
          coachProfileId: coachProfile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    return tx.coachAvailability.findMany({
      where: { coachProfileId: coachProfile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  });

  return success(result);
}
