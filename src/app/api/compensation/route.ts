import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { coachCompensationSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "compensation:view_all");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const rules = await db.coachCompensation.findMany({
    where: {
      effectiveTo: null,
      coachProfile: {
        user: { organizationId: orgId },
      },
    },
    include: {
      coachProfile: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      class: { select: { id: true, name: true } },
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return success(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "compensation:view_all");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = coachCompensationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Verify coach belongs to org
  const coach = await db.coachProfile.findFirst({
    where: {
      id: parsed.data.coachProfileId,
      user: { organizationId: orgId },
    },
  });
  if (!coach) return badRequest("Coach no encontrado en esta organización");

  // Verify class belongs to org (if provided)
  if (parsed.data.classId) {
    const cls = await db.class.findFirst({
      where: { id: parsed.data.classId, organizationId: orgId },
    });
    if (!cls) return badRequest("Clase no encontrada en esta organización");
  }

  const rule = await db.coachCompensation.create({
    data: {
      coachProfileId: parsed.data.coachProfileId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      classId: parsed.data.classId || null,
    },
    include: {
      coachProfile: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      class: { select: { id: true, name: true } },
    },
  });
  return success(rule, 201);
}
