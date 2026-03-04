import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, requirePermission } from "@/lib/api-helpers";

// GET /api/staff/coaches - Return coaches with their availability for admin scheduling
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const coaches = await db.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["COACH", "HEAD_COACH"] },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      coachProfile: {
        select: {
          id: true,
          specialties: true,
          availability: {
            where: { isActive: true },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
      },
    },
    orderBy: { firstName: "asc" },
  });

  return success(coaches);
}
