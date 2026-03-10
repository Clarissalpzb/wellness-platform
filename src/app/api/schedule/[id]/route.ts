import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, success, badRequest, requirePermission } from "@/lib/api-helpers";
import { scheduleUpdateSchema } from "@/lib/validations";

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

  try {
    await db.$transaction([
      db.waitlistEntry.deleteMany({ where: { classScheduleId: id } }),
      db.booking.deleteMany({ where: { classScheduleId: id } }),
      db.classSchedule.delete({ where: { id } }),
    ]);
    return success({ deleted: true });
  } catch (e) {
    console.error("Error deleting schedule:", e);
    return badRequest("No se pudo eliminar el horario");
  }
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

  const schedule = await db.classSchedule.findUnique({
    where: { id },
    include: { class: { select: { organizationId: true } } },
  });
  if (!schedule || schedule.class.organizationId !== orgId) {
    return notFound("Horario no encontrado");
  }

  const body = await req.json();
  const parsed = scheduleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const data: any = {};
  if (parsed.data.dayOfWeek !== undefined) data.dayOfWeek = parsed.data.dayOfWeek;
  if (parsed.data.startTime !== undefined) data.startTime = parsed.data.startTime;
  if (parsed.data.endTime !== undefined) data.endTime = parsed.data.endTime;
  if (parsed.data.locationId !== undefined) data.locationId = parsed.data.locationId;
  if (parsed.data.spaceId !== undefined) data.spaceId = parsed.data.spaceId || null;
  if (parsed.data.coachProfileId !== undefined) data.coachProfileId = parsed.data.coachProfileId || null;

  const updated = await db.classSchedule.update({ where: { id }, data });
  return success(updated);
}
