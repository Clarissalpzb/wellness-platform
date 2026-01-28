import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locationSchema } from "@/lib/validations";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

// GET /api/locations - List locations for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const locations = await db.location.findMany({
      where: { organizationId: orgId },
      include: { spaces: true },
      orderBy: { createdAt: "desc" },
    });

    return success(locations);
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return NextResponse.json(
      { error: "Error al obtener ubicaciones" },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create a new location
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const body = await req.json();
    const parsed = locationSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const location = await db.location.create({
      data: {
        ...parsed.data,
        organizationId: orgId,
      },
      include: { spaces: true },
    });

    return success(location, 201);
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return NextResponse.json(
      { error: "Error al crear ubicación" },
      { status: 500 }
    );
  }
}
