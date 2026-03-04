import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { classSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const classes = await db.class.findMany({
    where: { organizationId: orgId },
    include: {
      schedules: {
        include: {
          location: { select: { name: true } },
          space: { select: { name: true } },
          coachProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return success(classes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = classSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const newClass = await db.class.create({
    data: { ...parsed.data, organizationId: orgId },
  });
  return success(newClass, 201);
}
