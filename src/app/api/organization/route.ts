import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized, requirePermission } from "@/lib/api-helpers";

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
      select: { id: true, name: true, slug: true, logo: true, settings: true, monthlyOperatingCost: true },
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
    const deny = requirePermission(session, "settings:manage");
    if (deny) return deny;

    if (!orgId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 404 });
    }

    const body = await req.json();
    const { name, monthlyOperatingCost, settings: settingsPatch } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }

    const updateData: any = { name: name.trim() };

    if (monthlyOperatingCost !== undefined) {
      const cost = Number(monthlyOperatingCost);
      if (isNaN(cost) || cost < 0) {
        return NextResponse.json({ error: "Costo mensual inválido" }, { status: 400 });
      }
      updateData.monthlyOperatingCost = cost;
    }

    // Merge settings patch into existing settings (e.g. cancellationFee config)
    if (settingsPatch && typeof settingsPatch === "object") {
      const current = await db.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });
      const existing =
        typeof current?.settings === "object" && current.settings !== null
          ? (current.settings as Record<string, unknown>)
          : {};
      updateData.settings = { ...existing, ...settingsPatch };
    }

    const org = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      select: { id: true, name: true, slug: true, logo: true, settings: true, monthlyOperatingCost: true },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("PUT /api/organization error:", error);
    return NextResponse.json({ error: "Error al actualizar organización" }, { status: 500 });
  }
}
