import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";

// GET /api/users/[id] - Get a single user with full details
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        userPackages: {
          include: { package: true },
          orderBy: { purchaseDate: "desc" },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!user || user.organizationId !== orgId) {
      return notFound("Usuario no encontrado");
    }

    return success(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user (limited fields only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Usuario no encontrado");
    }

    const body = await req.json();

    // Only allow updating specific fields - do not allow role changes
    const { firstName, lastName, phone, healthFlags } = body;

    if (!firstName && !lastName && phone === undefined && healthFlags === undefined) {
      return badRequest("No se proporcionaron campos para actualizar");
    }

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (healthFlags !== undefined) updateData.healthFlags = healthFlags;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        userPackages: {
          include: { package: true },
          orderBy: { purchaseDate: "desc" },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return success(user);
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}
