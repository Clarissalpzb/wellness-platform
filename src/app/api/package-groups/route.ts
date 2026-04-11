import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, requirePermission, success, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string;

  if (!orgId) return badRequest("No hay organización en la sesión");

  try {
    const groups = await db.packageGroup.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { packages: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return success(groups);
  } catch (err: any) {
    console.error("[package-groups GET]", err);
    return NextResponse.json({ error: err?.message ?? "Error al cargar grupos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  if (!orgId) return badRequest("No hay organización en la sesión");

  const { name, description, color, emoji } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  try {
    const lastGroup = await db.packageGroup.findFirst({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const group = await db.packageGroup.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#4ade80",
        emoji: emoji || null,
        sortOrder: (lastGroup?.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { packages: true } } },
    });

    return success(group, 201);
  } catch (err: any) {
    console.error("[package-groups POST]", err);
    return NextResponse.json({ error: err?.message ?? "Error al crear grupo" }, { status: 500 });
  }
}
