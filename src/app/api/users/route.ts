import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized, success } from "@/lib/api-helpers";

// GET /api/users - List CLIENT users for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const users = await db.user.findMany({
      where: {
        organizationId: orgId,
        role: "CLIENT",
      },
      include: {
        userPackages: {
          where: { isActive: true },
          include: { package: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}
