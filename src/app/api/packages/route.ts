import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { packageSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const packages = await db.package.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { userPackages: true } } },
    orderBy: { createdAt: "desc" },
  });
  return success(packages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "packages:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = packageSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const newPackage = await db.package.create({
    data: { ...parsed.data, organizationId: orgId },
  });
  return success(newPackage, 201);
}
