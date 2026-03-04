import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { spaceSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

// POST /api/spaces - Create a new space
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "locations:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const body = await req.json();
    const parsed = spaceSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    // Verify the location belongs to the user's organization
    const location = await db.location.findUnique({
      where: { id: parsed.data.locationId },
    });

    if (!location || location.organizationId !== orgId) {
      return badRequest("La ubicación no pertenece a tu organización");
    }

    const space = await db.space.create({
      data: {
        name: parsed.data.name,
        capacity: parsed.data.capacity,
        amenities: parsed.data.amenities,
        locationId: parsed.data.locationId,
      },
    });

    return success(space, 201);
  } catch (error) {
    console.error("POST /api/spaces error:", error);
    return NextResponse.json(
      { error: "Error al crear espacio" },
      { status: 500 }
    );
  }
}
