import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId;

  const staff = await db.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["ADMIN", "FRONT_DESK", "COACH"] },
    },
    include: { coachProfile: true },
    orderBy: { createdAt: "desc" },
  });
  return success(staff);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const email = parsed.data.email || `staff-${Date.now().toString(36)}@placeholder.local`;

  const existingUser = await db.user.findUnique({
    where: { email },
  });
  if (existingUser) return badRequest("Ya existe un usuario con ese email");

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
      ...(parsed.data.role === "COACH"
        ? { coachProfile: { create: {} } }
        : {}),
    },
    include: { coachProfile: true },
  });
  return success(newStaff, 201);
}
