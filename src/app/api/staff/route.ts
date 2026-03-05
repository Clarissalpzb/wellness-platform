import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const staff = await db.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["ADMIN", "HEAD_COACH", "FRONT_DESK", "COACH"] },
    },
    include: { coachProfile: true },
    orderBy: { createdAt: "desc" },
  });
  return success(staff);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const email = parsed.data.email || `staff-${Date.now().toString(36)}@placeholder.local`;

  const existingUser = await db.user.findUnique({
    where: { email },
    include: { coachProfile: true },
  });

  if (existingUser) {
    // If user already belongs to a different org as staff, reject
    if (
      existingUser.organizationId &&
      existingUser.organizationId !== orgId &&
      existingUser.role !== "CLIENT"
    ) {
      return badRequest("Este usuario ya pertenece a otra organización como staff");
    }

    // Promote existing user (e.g. CLIENT) to the new staff role in this org
    const needsCoachProfile =
      (parsed.data.role === "COACH" || parsed.data.role === "HEAD_COACH") &&
      !existingUser.coachProfile;

    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: {
        role: parsed.data.role,
        organizationId: orgId,
        firstName: parsed.data.firstName || existingUser.firstName,
        lastName: parsed.data.lastName || existingUser.lastName,
        phone: parsed.data.phone || existingUser.phone,
        ...(needsCoachProfile ? { coachProfile: { create: {} } } : {}),
      },
      include: { coachProfile: true },
    });
    return success(updated, 200);
  }

  const passwordHash = await bcrypt.hash("temppass123", 12);

  const newStaff = await db.user.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || "",
      email,
      role: parsed.data.role,
      phone: parsed.data.phone,
      passwordHash,
      organizationId: orgId,
      ...(parsed.data.role === "COACH" || parsed.data.role === "HEAD_COACH"
        ? { coachProfile: { create: {} } }
        : {}),
    },
    include: { coachProfile: true },
  });
  return success(newStaff, 201);
}
