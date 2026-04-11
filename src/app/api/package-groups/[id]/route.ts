import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, requirePermission, success, notFound, badRequest } from "@/lib/api-helpers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;
  if (!orgId) return badRequest("No hay organización en la sesión");
  const { id } = await params;

  const existing = await db.packageGroup.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return notFound("Grupo no encontrado");

  const { name, description, color, emoji, sortOrder, isActive } = await req.json();

  try {
    const updated = await db.packageGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(emoji !== undefined && { emoji: emoji || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { packages: true } } },
    });

    return success(updated);
  } catch (err: any) {
    console.error("[package-groups PUT]", err);
    return NextResponse.json({ error: err?.message ?? "Error al actualizar grupo" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;
  if (!orgId) return badRequest("No hay organización en la sesión");
  const { id } = await params;

  const existing = await db.packageGroup.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return notFound("Grupo no encontrado");

  try {
    // Unlink packages from this group before deleting
    await db.package.updateMany({ where: { groupId: id }, data: { groupId: null } });
    await db.packageGroup.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[package-groups DELETE]", err);
    return NextResponse.json({ error: err?.message ?? "Error al eliminar grupo" }, { status: 500 });
  }
}
