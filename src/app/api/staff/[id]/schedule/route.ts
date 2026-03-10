import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, success, requirePermission } from "@/lib/api-helpers";

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

  const user = await db.user.findFirst({
    where: { id, organizationId: orgId },
    include: { coachProfile: true },
  });
  if (!user) return notFound("Miembro no encontrado");
  if (!user.coachProfile) return notFound("Este miembro no es coach");

  const [availability, classes] = await Promise.all([
    db.coachAvailability.findMany({
      where: { coachProfileId: user.coachProfile.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    db.classSchedule.findMany({
      where: {
        coachProfileId: user.coachProfile.id,
        isRecurring: true,
        isCancelled: false,
      },
      include: {
        class: { select: { name: true, color: true } },
        location: { select: { name: true } },
        space: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return success({
    availability: availability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
    classes: classes.map((s) => ({
      id: s.id,
      className: s.class.name,
      classColor: s.class.color,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      locationName: s.location.name,
      spaceName: s.space?.name ?? null,
    })),
  });
}
