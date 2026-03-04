import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { classSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const cls = await db.class.findFirst({
    where: { id, organizationId: orgId },
    include: {
      schedules: {
        include: {
          location: true,
          space: true,
          coachProfile: { include: { user: true } },
        },
      },
    },
  });
  if (!cls) return notFound("Clase no encontrada");
  return success(cls);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.class.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Clase no encontrada");

  const body = await req.json();
  const parsed = classSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const updated = await db.class.update({
    where: { id },
    data: parsed.data,
  });
  return success(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const existing = await db.class.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return notFound("Clase no encontrada");

  await db.class.delete({ where: { id } });
  return success({ deleted: true });
}
