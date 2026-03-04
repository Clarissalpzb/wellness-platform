import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, success, requirePermission } from "@/lib/api-helpers";

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

  const schedule = await db.classSchedule.findUnique({
    where: { id },
    include: { class: { select: { organizationId: true } } },
  });
  if (!schedule || schedule.class.organizationId !== orgId) {
    return notFound("Horario no encontrado");
  }

  await db.classSchedule.delete({ where: { id } });
  return success({ deleted: true });
}
