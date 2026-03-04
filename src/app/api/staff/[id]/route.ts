import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const member = await db.user.findFirst({
    where: { id, organizationId: orgId },
    include: { coachProfile: true },
  });
  if (!member) return notFound("Miembro del staff no encontrado");
  return success(member);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.user.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Miembro del staff no encontrado");

  const body = await req.json();
  const parsed = staffSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const updated = await db.user.update({
    where: { id },
    data: parsed.data,
    include: { coachProfile: true },
  });
  return success(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.user.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Miembro del staff no encontrado");

  await db.user.delete({ where: { id } });
  return success({ deleted: true });
}
