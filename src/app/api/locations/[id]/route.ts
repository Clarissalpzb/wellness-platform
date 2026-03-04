import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locationSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

// GET /api/locations/[id] - Get a single location with spaces
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "locations:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const location = await db.location.findUnique({
      where: { id },
      include: { spaces: true },
    });

    if (!location || location.organizationId !== orgId) {
      return notFound("Ubicación no encontrada");
    }

    return success(location);
  } catch (error) {
    console.error("GET /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener ubicación" },
      { status: 500 }
    );
  }
}

// PUT /api/locations/[id] - Update a location
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "locations:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.location.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Ubicación no encontrada");
    }

    const body = await req.json();
    const parsed = locationSchema.partial().safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const location = await db.location.update({
      where: { id },
      data: parsed.data,
      include: { spaces: true },
    });

    return success(location);
  } catch (error) {
    console.error("PUT /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar ubicación" },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id] - Delete a location (cascades to spaces)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "locations:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.location.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Ubicación no encontrada");
    }

    await db.location.delete({ where: { id } });

    return success({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar ubicación" },
      { status: 500 }
    );
  }
}
