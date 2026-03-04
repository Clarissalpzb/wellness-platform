import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { spaceSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

// PUT /api/spaces/[id] - Update a space
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

    // Verify the space exists and its location belongs to the org
    const existing = await db.space.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!existing || existing.location.organizationId !== orgId) {
      return notFound("Espacio no encontrado");
    }

    const body = await req.json();
    const parsed = spaceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    // If locationId is being changed, verify the new location belongs to the org
    if (parsed.data.locationId && parsed.data.locationId !== existing.locationId) {
      const newLocation = await db.location.findUnique({
        where: { id: parsed.data.locationId },
      });

      if (!newLocation || newLocation.organizationId !== orgId) {
        return badRequest("La ubicación no pertenece a tu organización");
      }
    }

    const space = await db.space.update({
      where: { id },
      data: parsed.data,
    });

    return success(space);
  } catch (error) {
    console.error("PUT /api/spaces/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar espacio" },
      { status: 500 }
    );
  }
}

// DELETE /api/spaces/[id] - Delete a space
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

    // Verify the space exists and its location belongs to the org
    const existing = await db.space.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!existing || existing.location.organizationId !== orgId) {
      return notFound("Espacio no encontrado");
    }

    await db.space.delete({ where: { id } });

    return success({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/spaces/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar espacio" },
      { status: 500 }
    );
  }
}
