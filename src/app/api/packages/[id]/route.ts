import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { packageSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const pkg = await db.package.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { userPackages: true } } },
  });
  if (!pkg) return notFound("Paquete no encontrado");
  return success(pkg);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.package.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Paquete no encontrado");

  const body = await req.json();
  const { groupId, isFeatured, metadata, ...rest } = body;
  const parsed = packageSchema.partial().safeParse(rest);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const updated = await db.package.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(groupId !== undefined && { groupId: groupId || null }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(metadata !== undefined && { metadata }),
    },
    include: {
      group: { select: { id: true, name: true, color: true, emoji: true } },
    },
  });
  return success(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.package.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Paquete no encontrado");

  await db.package.delete({ where: { id } });
  return success({ deleted: true });
}
