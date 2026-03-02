import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";

// GET /api/organization - Get current user's organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 404 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, logo: true, settings: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error("GET /api/organization error:", error);
    return NextResponse.json({ error: "Error al obtener organización" }, { status: 500 });
  }
}

// PUT /api/organization - Update organization name/settings
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;
    const role = (session.user as any).role;

    if (!orgId || (role !== "OWNER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data: { name: name.trim() },
      select: { id: true, name: true, slug: true, logo: true, settings: true },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("PUT /api/organization error:", error);
    return NextResponse.json({ error: "Error al actualizar organización" }, { status: 500 });
  }
}
