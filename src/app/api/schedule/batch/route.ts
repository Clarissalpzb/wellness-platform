import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";
import { batchScheduleSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string;

  const body = await req.json();
  const parsed = batchScheduleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { schedules } = parsed.data;

  // Validate all classIds belong to this org
  const classIds = [...new Set(schedules.map((s) => s.classId))];
  const orgClasses = await db.class.findMany({
    where: { id: { in: classIds }, organizationId: orgId },
    select: { id: true },
  });
  const orgClassIds = new Set(orgClasses.map((c) => c.id));

  for (const s of schedules) {
    if (!orgClassIds.has(s.classId)) {
      return badRequest(`Clase ${s.classId} no pertenece a la organización`);
    }
  }

  // Create all schedules in a transaction
  const created = await db.$transaction(
    schedules.map((s) =>
      db.classSchedule.create({
        data: s,
      })
    )
  );

  return success({ created: created.length }, 201);
}
