import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { coachCompensationSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "compensation:view_all");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.coachCompensation.findFirst({
    where: {
      id,
      coachProfile: { user: { organizationId: orgId } },
    },
  });
  if (!existing) return notFound("Regla de compensación no encontrada");

  const body = await req.json();
  const parsed = coachCompensationSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Verify class belongs to org if changing classId
  if (parsed.data.classId) {
    const cls = await db.class.findFirst({
      where: { id: parsed.data.classId, organizationId: orgId },
    });
    if (!cls) return badRequest("Clase no encontrada en esta organización");
  }

  const updated = await db.coachCompensation.update({
    where: { id },
    data: {
      ...(parsed.data.type !== undefined && { type: parsed.data.type }),
      ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
      ...(parsed.data.classId !== undefined && { classId: parsed.data.classId || null }),
      ...(parsed.data.coachProfileId !== undefined && { coachProfileId: parsed.data.coachProfileId }),
    },
    include: {
      coachProfile: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      class: { select: { id: true, name: true } },
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
  const deny = requirePermission(session, "compensation:view_all");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.coachCompensation.findFirst({
    where: {
      id,
      coachProfile: { user: { organizationId: orgId } },
    },
  });
  if (!existing) return notFound("Regla de compensación no encontrada");

  await db.coachCompensation.delete({ where: { id } });
  return success({ deleted: true });
}
